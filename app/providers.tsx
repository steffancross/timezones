'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider, usePostHog } from 'posthog-js/react';
import { Suspense, useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import env from '@/lib/env';

if (typeof window !== 'undefined') {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    // Direct PostHog host — the /ingest/* rewrite path doesn't work on
    // OpenNext/Cloudflare (external rewrites become 308 redirects, ad
    // blockers still see the PostHog domain). See CLAUDE.md.
    api_host: 'https://us.i.posthog.com',
    ui_host: 'https://us.posthog.com',
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: 'identified_only',
    persistence: 'localStorage+cookie',
    // We only send two manual events: $pageview (PageviewTracker below) and
    // render_error (app/error.tsx). Disable every auto-loaded module so
    // PostHog doesn't fetch ~90KB of recorder.js + surveys.js + dead-clicks +
    // web-vitals scripts on first paint. Re-enable individually if a feature
    // is ever turned on.
    autocapture: false,
    disable_session_recording: true,
    disable_surveys: true,
    capture_performance: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    capture_exceptions: false,
    disable_web_experiments: true,
    // Belt-and-suspenders: stops PostHog from lazy-loading any external module
    // even if a future SDK release adds one that's on by default.
    disable_external_dependency_loading: true,
  });
  posthog.register({ site: env.NEXT_PUBLIC_SITE_ID });
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
    </PostHogProvider>
  );
}

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (!pathname || !ph) return;
    const url = window.origin + pathname + (searchParams.toString() ? `?${searchParams}` : '');
    ph.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams, ph]);

  return null;
}

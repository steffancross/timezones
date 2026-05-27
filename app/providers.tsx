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

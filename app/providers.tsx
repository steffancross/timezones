'use client';

import { usePathname } from 'next/navigation';
import type { PostHog } from 'posthog-js';
import { useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import env from '@/lib/env';

// posthog-js is ~121KB parsed and loads on every page. We only ever fire two
// events ($pageview here, render_error in app/error.tsx), so nothing on the
// critical render path needs it. Dynamically import + init it after first paint
// so Turbopack splits it into its own deferred chunk instead of the initial
// bundle. `import type` above is erased at build time and does NOT pull the
// library in; the real `import('posthog-js')` below is what creates the chunk.
let phPromise: Promise<PostHog> | null = null;
function loadPostHog(): Promise<PostHog> {
  phPromise ??= import('posthog-js').then(({ default: posthog }) => {
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
      // web-vitals scripts. Re-enable individually if a feature is ever on.
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
    return posthog;
  });
  return phPromise;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={300}>
      <PageviewTracker />
      {children}
    </TooltipProvider>
  );
}

function PageviewTracker() {
  const pathname = usePathname();

  // Fire a $pageview only on real navigations (pathname change), NOT on
  // query-param-only updates. The converter mirrors slider/date/format state
  // into the URL via history.replaceState (see UrlSync) — those are not page
  // views and must not inflate counts. We read window.location at fire time so a
  // share-link landing still records its full URL (params included) on mount.
  // This effect runs after first paint, which is also where the posthog-js
  // chunk first loads (the initial $pageview awaits the dynamic import).
  useEffect(() => {
    if (!pathname) return;
    const url = window.location.origin + window.location.pathname + window.location.search;
    loadPostHog().then((ph) => {
      ph.capture('$pageview', { $current_url: url });
    });
  }, [pathname]);

  return null;
}

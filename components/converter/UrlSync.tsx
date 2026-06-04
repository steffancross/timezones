'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useConverterStore } from '@/components/converter/store-context';
import { stateToQueryString } from '@/lib/store/to-url';

/**
 * Subscribes to URL-relevant store fields and mirrors them into the address bar
 * via the native History API (`replaceState` — no history entry). Mount once
 * inside the converter.
 *
 * Why `history.replaceState` and not `router.replace`: in the App Router,
 * `router.replace` is a navigation — it fetches the destination's RSC payload
 * from the server even when only the query string changes. Cache interception
 * serves prerendered HTML, not partial RSC, so each one boots NextServer and
 * re-renders → a Worker request + CPU per slider nudge. The URL here is purely a
 * write-only mirror of the store (initial state is SSR'd from the slug, and
 * SearchParamsHydrator seeds `?d/?r/?f/?z` once on mount), so we want a
 * client-only URL update with zero server round-trip. `history.replaceState`
 * does exactly that. Passing `window.history.state` preserves Next's internal
 * routing metadata on the current entry.
 *
 * Debounced lightly to avoid rapid URL updates during hover/preview interactions.
 */
export function UrlSync() {
  const pathname = usePathname();

  const anchorDate = useConverterStore((s) => s.anchorDate);
  const defaultAnchorDate = useConverterStore((s) => s.defaultAnchorDate);
  const rangeStartMin = useConverterStore((s) => s.rangeStartMin);
  const rangeEndMin = useConverterStore((s) => s.rangeEndMin);
  const format = useConverterStore((s) => s.format);

  useEffect(() => {
    const qs = stateToQueryString({
      anchorDate,
      defaultAnchorDate,
      rangeStartMin,
      rangeEndMin,
      format,
    });
    const next = qs ? `${pathname}?${qs}` : pathname;

    // Normalize trailing slashes so Next's trailingSlash mode doesn't cause a
    // spurious replace on mount.
    const stripSlash = (p: string) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p);
    const currentPath = stripSlash(window.location.pathname);
    const nextPath = stripSlash(pathname);
    if (currentPath === nextPath && window.location.search === (qs ? `?${qs}` : '')) return;

    const t = setTimeout(() => {
      window.history.replaceState(window.history.state, '', next);
    }, 100);

    return () => clearTimeout(t);
  }, [pathname, anchorDate, defaultAnchorDate, rangeStartMin, rangeEndMin, format]);

  return null;
}

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useConverterStore } from '@/components/converter/store-context';
import { stateToQueryString } from '@/lib/store/to-url';

/**
 * Subscribes to URL-relevant store fields and updates the URL via
 * router.replace (no history entry). Mount once inside the converter.
 *
 * Debounced lightly to avoid rapid URL updates during hover/preview interactions.
 */
export function UrlSync() {
  const router = useRouter();
  const pathname = usePathname();

  const anchorDate = useConverterStore((s) => s.anchorDate);
  const defaultAnchorDate = useConverterStore((s) => s.defaultAnchorDate);
  const rangeStart = useConverterStore((s) => s.rangeStart);
  const rangeEnd = useConverterStore((s) => s.rangeEnd);
  const format = useConverterStore((s) => s.format);

  useEffect(() => {
    const qs = stateToQueryString({
      anchorDate,
      defaultAnchorDate,
      rangeStart,
      rangeEnd,
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
      router.replace(next, { scroll: false });
    }, 100);

    return () => clearTimeout(t);
  }, [pathname, anchorDate, defaultAnchorDate, rangeStart, rangeEnd, format, router]);

  return null;
}

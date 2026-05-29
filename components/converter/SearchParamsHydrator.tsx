'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useConverterStoreApi } from '@/components/converter/store-context';
import { parseSearchParams, urlToState } from '@/lib/store/from-url';

/**
 * Reads URL search params (`?d`, `?r`, `?f`, `?z`) once on mount and applies
 * them to the per-mount converter store.
 *
 * Why this exists: pair pages used to read `searchParams` in their Server
 * Component to seed initial state. In App Router, accessing `searchParams` in
 * a Server Component opts the route out of static rendering — even with
 * `revalidate = 86400`, the route is served per-request with
 * `cache-control: no-store`. Moving the search-param read to the client lets
 * the slug-derived state stay SSR'd while the route itself becomes truly SSG.
 *
 * Trade: a share-link visit (URL with `?d=…` etc.) shows the slug-derived
 * defaults for one frame before this hydrator applies the URL overrides.
 * Direct visits to `/convert/pst-to-gmt` (no search params) are unaffected.
 *
 * On the homepage, the same params are already applied SSR-side via
 * `initialState` (the homepage is `force-dynamic` for cf-timezone), so this
 * hydrator re-runs them as no-ops — the values match what's already in the
 * store.
 */
export function SearchParamsHydrator() {
  const searchParams = useSearchParams();
  const store = useConverterStoreApi();
  // Mount-only; subsequent search-param changes come from UrlSync writing the
  // store back to the URL, not from external navigation we need to re-hydrate.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const parsed = parseSearchParams({
      d: searchParams.get('d') ?? undefined,
      r: searchParams.get('r') ?? undefined,
      f: searchParams.get('f') ?? undefined,
      z: searchParams.get('z') ?? undefined,
    });

    // Route through urlToState to reuse its validators (date shape, range
    // bounds, format whitelist). Anything malformed falls out here instead
    // of polluting the store.
    const overrides = urlToState({
      zones: parsed.zones,
      date: parsed.date,
      rangeStart: parsed.rangeStart,
      rangeEnd: parsed.rangeEnd,
      format: parsed.format,
    });

    const state = store.getState();

    // ?z= overrides the slug-derived zones (share-link case). Use setZones so
    // homeZoneIndex re-clamps and anchorDate re-derives correctly.
    if (overrides.zones && overrides.zones.length > 0) {
      state.setZones(overrides.zones);
    }

    if (overrides.anchorDate) {
      state.setAnchorDate(overrides.anchorDate);
    }

    if (typeof overrides.rangeStart === 'number') {
      const end = overrides.rangeEnd ?? overrides.rangeStart;
      state.setRange(overrides.rangeStart, end);
    }

    if (overrides.format) {
      state.setFormat(overrides.format);
    }
  }, [searchParams, store]);

  return null;
}

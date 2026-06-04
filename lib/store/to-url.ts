import type { ConverterState } from './converter';

/**
 * Build a query string from the URL-syncable state slice.
 * Returns the string without the leading '?' — caller adds it.
 *
 * Only includes non-default values to keep shared URLs clean. The store's
 * `defaultAnchorDate` snapshot is the source of truth for "what counts as
 * today" — we don't recompute today here, which keeps URL output deterministic
 * for a given store snapshot (and avoids SSR/client clock divergence).
 */
export function stateToQueryString(
  state: Pick<
    ConverterState,
    'anchorDate' | 'defaultAnchorDate' | 'rangeStartMin' | 'rangeEndMin' | 'format'
  > & {
    zones?: ConverterState['zones'];
    includeZones?: boolean;
  },
): string {
  const params = new URLSearchParams();

  if (state.includeZones && state.zones && state.zones.length > 0) {
    params.set('z', state.zones.map((z) => z.slug).join(','));
  }

  if (state.anchorDate !== state.defaultAnchorDate) {
    params.set('d', state.anchorDate);
  }

  if (state.rangeStartMin !== null) {
    // `r=HHmm-HHmm`, zero-padded 24h, half-open. The end is exclusive; 1440
    // (next-day midnight) serializes as the `2400` sentinel. rangeEndMin is
    // left null by URL-only callers, so we fall back to a 1-hour block.
    const end = state.rangeEndMin ?? state.rangeStartMin + 60;
    params.set('r', `${minToHHmm(state.rangeStartMin)}-${minToHHmm(end)}`);
  }

  if (state.format !== '12') {
    params.set('f', state.format);
  }

  return params.toString();
}

/** Minutes-of-day → `HHmm` (24h, zero-padded). 1440 → `2400` (next-day midnight). */
function minToHHmm(min: number): string {
  if (min >= 1440) return '2400';
  return `${String(Math.floor(min / 60)).padStart(2, '0')}${String(min % 60).padStart(2, '0')}`;
}

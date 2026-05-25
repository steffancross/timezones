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
    'anchorDate' | 'defaultAnchorDate' | 'rangeStart' | 'rangeEnd' | 'format'
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

  if (state.rangeStart !== null) {
    // Compact form: `r=14` when the block is 1-tile, `r=14-15` when wider.
    // rangeEnd is left null by URL-only callers, so we fall back to rangeStart.
    const end = state.rangeEnd ?? state.rangeStart;
    params.set(
      'r',
      end === state.rangeStart ? String(state.rangeStart) : `${state.rangeStart}-${end}`,
    );
  }

  if (state.format !== '12') {
    params.set('f', state.format);
  }

  return params.toString();
}

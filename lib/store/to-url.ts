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
  state: Pick<ConverterState, 'anchorDate' | 'defaultAnchorDate' | 'anchorHour' | 'format'>,
): string {
  const params = new URLSearchParams();

  if (state.anchorDate !== state.defaultAnchorDate) {
    params.set('d', state.anchorDate);
  }

  if (state.anchorHour !== null) {
    params.set('h', String(state.anchorHour));
  }

  if (state.format !== '12') {
    params.set('f', state.format);
  }

  return params.toString();
}

import type { ConverterState } from './converter';

/**
 * Build a query string from the URL-syncable state slice.
 * Returns the string without the leading '?' — caller adds it.
 *
 * Only includes non-default values to keep shared URLs clean.
 */
export function stateToQueryString(
  state: Pick<ConverterState, 'anchorDate' | 'anchorHour' | 'format'>,
): string {
  const params = new URLSearchParams();

  const today = new Date().toISOString().slice(0, 10);
  if (state.anchorDate !== today) {
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

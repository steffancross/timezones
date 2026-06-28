/**
 * Smart Converter — countdown math and relative phrasing (pure).
 *
 * The card computes `targetInstantMs - now` each second and feeds the signed
 * delta here. `breakdown` splits it into d/h/m/s (always non-negative magnitudes
 * plus a `past` flag); `relativePhrase` gives the minimal lead line. Past events
 * read "happened X ago", never a negative countdown (rule 5).
 */

export interface CountdownParts {
  /** True when the instant is in the past (delta < 0). */
  past: boolean;
  d: number;
  h: number;
  m: number;
  s: number;
}

/** Split a signed millisecond delta into d/h/m/s magnitudes + a past flag. */
export function breakdown(deltaMs: number): CountdownParts {
  const past = deltaMs < 0;
  let s = Math.floor(Math.abs(deltaMs) / 1000);
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  return { past, d, h, m, s };
}

/**
 * Minimal relative phrasing — the big countdown carries the rest. Leads with the
 * coarsest useful unit: "in 20 days", "in 4 hours", "in 12 min" / "… ago".
 */
export function relativePhrase(parts: CountdownParts): string {
  const { past, d, h, m } = parts;
  let lead: string;
  if (d > 0) lead = `${d} day${d === 1 ? '' : 's'}`;
  else if (h > 0) lead = `${h} hour${h === 1 ? '' : 's'}`;
  else lead = `${m} min`;
  return past ? `${lead} ago` : `in ${lead}`;
}

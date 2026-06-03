/**
 * Format a UTC offset given in minutes as a `UTC±H[:MM]` label, e.g.
 * `-480` → `UTC−8`, `330` → `UTC+5:30`, `0` → `UTC±0`. Uses the typographic
 * minus (−, U+2212) so the sign aligns with the plus in mixed lists.
 */
export function formatUtcOffset(minutes: number): string {
  if (minutes === 0) return 'UTC±0';
  const sign = minutes < 0 ? '−' : '+';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, '0')}`;
}

/**
 * Range granularity helpers.
 *
 * The selected range is stored in the converter store as a half-open interval
 * of home-zone minutes-of-day: `[rangeStartMin, rangeEndMin)`, both multiples
 * of `RANGE_STEP_MIN`. The hour strip stays coarse (one tile per hour) — the
 * columns it highlights are *derived* from the minute interval here, so the two
 * can never drift. A full-hour drag produces `{startMin: col*60, endMin:
 * (col+1)*60}`, reproducing the original hour-column behavior exactly.
 */

export const RANGE_STEP_MIN = 15;
export const MINUTES_PER_DAY = 1440;

/**
 * The home-zone hour columns (inclusive indices 0–23) that the half-open
 * minute interval `[startMin, endMin)` overlaps. The end is exclusive, so a
 * sliver into a column still lights it (5:00–5:15 lights the 5:00–6:00 column),
 * but an interval ending exactly on a boundary does not light the column it
 * abuts (…–5:00 stops at the 4:00–5:00 column). Returns null when no range.
 *
 *   {180, 360}  (3:00–6:00)  → {3, 5}  → cols 3,4,5
 *   {180, 315}  (3:00–5:15)  → {3, 5}  → cols 3,4,5
 *   {180, 300}  (3:00–5:00)  → {3, 4}  → cols 3,4
 *   {1380,1440} (23:00–24:00)→ {23,23} → col 23  (midnight capped, no col 24)
 */
export function rangeColumns(
  startMin: number | null,
  endMin: number | null,
): { startCol: number; endCol: number } | null {
  if (startMin === null || endMin === null) return null;
  const startCol = Math.floor(startMin / 60);
  // endMin is exclusive; last overlapped column is ceil(endMin/60)-1. Cap at 23
  // so an end of 1440 (next-day midnight) lands on column 23, not a phantom 24.
  const endCol = Math.min(23, Math.max(startCol, Math.ceil(endMin / 60) - 1));
  return { startCol, endCol };
}

import { DateTime, Info } from 'luxon';

export interface CalendarCell {
  /** ISO date, e.g. '2026-05-14'. */
  iso: string;
  /** Day of month, 1-31. */
  day: number;
  /** Whether the cell belongs to the rendered month (vs. leading/trailing spill). */
  inMonth: boolean;
  /** Saturday or Sunday. */
  isWeekend: boolean;
}

/**
 * Short weekday labels (Sun-first), locale-aware via Luxon. Luxon's
 * `Info.weekdays` is Monday-first, so we rotate Sunday to the front to match
 * the app's Sunday-first week convention.
 */
const MONDAY_FIRST = Info.weekdays('short');
export const WEEKDAY_LABELS: string[] = [...MONDAY_FIRST.slice(6), ...MONDAY_FIRST.slice(0, 6)];

/**
 * Build a 6×7 (42-cell) month grid, Sunday-first. Leading/trailing cells spill
 * into the adjacent months so every week is full; `inMonth` distinguishes them.
 *
 * @param year  Calendar year (e.g. 2026)
 * @param month 1-12
 */
export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const first = DateTime.fromObject({ year, month, day: 1 });
  // Luxon weekday: Mon=1 … Sun=7. Walk back to the Sunday on/before the 1st
  // (Sun=7 → 0 days back via the mod).
  const start = first.minus({ days: first.weekday % 7 });

  return Array.from({ length: 42 }, (_, i) => {
    const dt = start.plus({ days: i });
    return {
      iso: dt.toISODate() ?? '',
      day: dt.day,
      inMonth: dt.month === month && dt.year === year,
      isWeekend: dt.weekday >= 6,
    };
  });
}

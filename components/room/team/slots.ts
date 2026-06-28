// Small shared helpers for the half-hour grid. Labels go through lib/time/format
// (no bespoke time formatting). A slot k (0..47) is local half-hour: hour
// floor(k/2), minute (k%2)*30.

import { WEEKDAY_LABELS } from '@/lib/time/calendar';
import { formatClock, formatHourTile } from '@/lib/time/format';
import { DateTime } from '@/lib/time/luxon';

/** Pixels per half-hour row — the anchored row height. */
export const ROW_H = 17;

/** Full clock label for a slot start, e.g. 18 → "9:00 am". */
export function slotLabel(k: number): string {
  return formatClock(Math.floor(k / 2) % 24, (k % 2) * 30, '12');
}

/** Compact hour label for the time gutter, e.g. hour 9 → "9a", 0 → "12a". */
export function hourLabel(hour: number): string {
  return formatHourTile(hour, '12');
}

export type WeekColumn = {
  index: number; // 0 = Sunday … 6 = Saturday (viewer frame)
  label: string; // "Sun" … "Sat"
  dayNum: number; // day of month
  iso: string; // 'YYYY-MM-DD'
  weekend: boolean;
};

/** The 7 Sunday-first day columns for a week, dated from the (Sunday) weekAnchor. */
export function buildWeekColumns(weekAnchor: string): WeekColumn[] {
  const start = DateTime.fromISO(weekAnchor);
  return Array.from({ length: 7 }, (_, c) => {
    const dt = start.plus({ days: c });
    return {
      index: c,
      label: WEEKDAY_LABELS[c] ?? '',
      dayNum: dt.day,
      iso: dt.toISODate() ?? '',
      weekend: c === 0 || c === 6, // Sunday-first: Sun & Sat
    };
  });
}

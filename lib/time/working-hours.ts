export interface WorkingHours {
  /** Start hour, 0-23. Inclusive. */
  readonly start: number;
  /** End hour, 0-23. Exclusive. So 9-17 means 9am-4:59pm. */
  readonly end: number;
  /** Weekdays this applies to. 1=Monday, 7=Sunday (Luxon convention). */
  readonly days: readonly number[];
}

/**
 * Default working hours: 9am-5pm Monday-Friday.
 * Per project decisions, this is a single global setting for v1
 * (no per-zone overrides).
 */
export const DEFAULT_WORKING_HOURS: WorkingHours = Object.freeze({
  start: 9,
  end: 17,
  days: Object.freeze([1, 2, 3, 4, 5]),
});

/**
 * Storage key for localStorage persistence.
 * Settings modal in E8 reads/writes via this key.
 */
export const WORKING_HOURS_STORAGE_KEY = 'working_hours';

/**
 * Check if a given hour on a given weekday is within working hours.
 *
 * @param hour 0-23
 * @param weekday 1-7 (Luxon convention: Monday = 1)
 * @param wh Working hours config (defaults to global default)
 */
export function isWorkingHour(
  hour: number,
  weekday: number,
  wh: WorkingHours = DEFAULT_WORKING_HOURS,
): boolean {
  if (!wh.days.includes(weekday)) return false;
  return hour >= wh.start && hour < wh.end;
}

/**
 * Get the hours (0-23) that are working hours for a given weekday.
 * Returns empty array for non-working days.
 */
export function getWorkingHoursOnDay(
  weekday: number,
  wh: WorkingHours = DEFAULT_WORKING_HOURS,
): number[] {
  if (!wh.days.includes(weekday)) return [];
  const result: number[] = [];
  for (let h = wh.start; h < wh.end; h++) result.push(h);
  return result;
}

import { DateTime } from 'luxon';

export interface WorkingHours {
  /** Start hour, 0-23. Inclusive. */
  readonly start: number;
  /** End hour, 0-23. Inclusive. So 9-17 means the 9am through 5pm hour columns are working hours. */
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
  return hour >= wh.start && hour <= wh.end;
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
  for (let h = wh.start; h <= wh.end; h++) result.push(h);
  return result;
}

export interface BusinessOverlapWindow {
  /** Inclusive start hour (0-23) in `from` zone. */
  fromStartHour: number;
  /** Exclusive end hour (1-24) in `from` zone. */
  fromEndHour: number;
  /** Corresponding `to`-zone hour for `fromStartHour`. */
  toStartHour: number;
  /** Exclusive end hour (1-24) in `to` zone for the window. */
  toEndHour: number;
  /**
   * Day shift on the `to` side relative to `from`:
   *  - 0: same calendar day
   *  - +1: `to` is on the next day (`from` morning → `to` next-day morning)
   *  - -1: `to` is on the previous day
   */
  toDayDelta: -1 | 0 | 1;
}

/**
 * Compute weekday business-hours overlap between two zones.
 *
 * Anchored on a Monday so the result doesn't depend on today's day of week
 * — i.e., the function returns the same answer when called on a weekend as
 * on a weekday. The earlier implementation in `WhenToSchedule` used
 * `DateTime.now().startOf('day')` and silently returned empty whenever today
 * was Sat/Sun in the `from` zone; this function exists specifically to fix
 * that.
 *
 * Returns 0+ windows of contiguous `from`-zone hours where both zones are
 * simultaneously in working hours. Windows are split if `toDayDelta` changes
 * within them (e.g., near midnight in `to`).
 *
 * `referenceMonday` is for tests — pass a fixed `DateTime` to make assertions
 * deterministic across DST seasons. Defaults to the current week's Monday in
 * `fromIana`.
 */
export function computeBusinessOverlap(
  fromIana: string,
  toIana: string,
  wh: WorkingHours = DEFAULT_WORKING_HOURS,
  referenceMonday?: DateTime,
): BusinessOverlapWindow[] {
  // setZone must precede startOf('week'): a UTC Monday at 00:00 lands on the
  // preceding Sunday once shifted into a west-of-UTC zone, which would make
  // `monday.weekday === 7` and short-circuit the search. Normalize to the
  // target zone first.
  const monday = (referenceMonday ?? DateTime.now()).setZone(fromIana).startOf('week');

  // Sanity: Luxon's startOf('week') = Monday under ISO rules. If wh.days
  // somehow excludes Monday, the `from` side is never working — empty result.
  if (!wh.days.includes(monday.weekday)) return [];

  type Hit = { fromHour: number; toHour: number; toDayDelta: -1 | 0 | 1 };
  const hits: Hit[] = [];

  for (let fromHour = wh.start; fromHour <= wh.end; fromHour++) {
    const fromLocal = monday.set({ hour: fromHour, minute: 0, second: 0, millisecond: 0 });
    const toLocal = fromLocal.setZone(toIana);

    if (!wh.days.includes(toLocal.weekday)) continue;
    if (toLocal.hour < wh.start || toLocal.hour > wh.end) continue;

    const fromDay = fromLocal.toISODate();
    const toDay = toLocal.toISODate();
    let toDayDelta: -1 | 0 | 1 = 0;
    if (fromDay && toDay && fromDay !== toDay) toDayDelta = toDay > fromDay ? 1 : -1;

    hits.push({ fromHour, toHour: toLocal.hour, toDayDelta });
  }

  // Group hits into windows: contiguous `fromHour` runs that share the same
  // `toDayDelta`. Any gap in `fromHour` or change in `toDayDelta` starts a new
  // window.
  const windows: BusinessOverlapWindow[] = [];
  let current: BusinessOverlapWindow | null = null;
  for (const hit of hits) {
    if (
      current === null ||
      hit.fromHour !== current.fromEndHour ||
      hit.toDayDelta !== current.toDayDelta
    ) {
      if (current) windows.push(current);
      current = {
        fromStartHour: hit.fromHour,
        fromEndHour: hit.fromHour + 1,
        toStartHour: hit.toHour,
        toEndHour: hit.toHour + 1,
        toDayDelta: hit.toDayDelta,
      };
    } else {
      current.fromEndHour = hit.fromHour + 1;
      current.toEndHour = hit.toHour + 1;
    }
  }
  if (current) windows.push(current);

  return windows;
}

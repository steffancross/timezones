// The one place raw Luxon timezone/DST logic lives for the compute layer (spec 3),
// mirroring how blob.ts centralizes the weekday-convention footgun. Projection
// consumes clean {millis, nonexistent} / {localDate, dow, halfHour} from here and
// never touches offsets itself.
//
// DST edges (empirically verified against Luxon 3.7.2 — see the spec):
//   - Spring-forward GAP: Luxon does NOT invalidate a nonexistent wall-time; it
//     silently advances the offset and stays .isValid. So we detect a gap by
//     round-tripping the requested hour/minute and comparing — a mismatch means
//     the cell doesn't exist for the viewer.
//   - Fall-back OVERLAP: Luxon already resolves an ambiguous wall-time to the
//     EARLIER offset, which is exactly the rule we want — taken for free, pinned
//     by a regression test.

import { DateTime } from '@/lib/time/luxon';
import { blobDow } from '../blob';

/** The Sunday on/before `now` in the viewer's zone, as 'YYYY-MM-DD'. */
export function currentWeekAnchor(viewerTz: string, now: number): string {
  // Same Sunday walk-back as buildMonthGrid (lib/time/calendar.ts): Luxon weekday
  // is Mon=1..Sun=7, so `% 7` maps Sunday(7)→0 days back, Mon(1)→1, … Sat(6)→6.
  const local = DateTime.fromMillis(now).setZone(viewerTz).startOf('day');
  const iso = local.minus({ days: local.weekday % 7 }).toISODate();
  if (!iso) throw new Error(`currentWeekAnchor: invalid now/zone (${now}, ${viewerTz})`);
  return iso;
}

/**
 * The viewer's week-start DateTime (00:00 of `weekAnchor` in `viewerTz`).
 * Throws if `weekAnchor` isn't a real date or isn't a Sunday — a cheap dev
 * invariant (blob.ts "loud, not silently repaired").
 */
export function viewerWeekStart(weekAnchor: string, viewerTz: string): DateTime {
  const date = DateTime.fromISO(weekAnchor, { zone: viewerTz });
  if (!date.isValid) throw new Error(`viewerWeekStart: invalid weekAnchor "${weekAnchor}"`);
  if (date.weekday !== 7) {
    throw new Error(`viewerWeekStart: weekAnchor "${weekAnchor}" is not a Sunday`);
  }
  return date.startOf('day');
}

/**
 * A viewer cell (day d 0..6, slot k 0..47) → its absolute instant, plus whether
 * that local wall-time exists. Takes the pre-built `weekStart` so the projection
 * loop parses the anchor once. `nonexistent` is the spring-forward gap flag.
 */
export function cellInstant(
  weekStart: DateTime,
  d: number,
  k: number,
): { millis: number; nonexistent: boolean } {
  const hour = Math.floor(k / 2);
  const minute = (k % 2) * 30;
  const dt = weekStart.plus({ days: d }).set({ hour, minute, second: 0, millisecond: 0 });
  // Luxon silently shifts a gap time forward; the requested components won't survive.
  const nonexistent = dt.hour !== hour || dt.minute !== minute;
  return { millis: dt.toMillis(), nonexistent };
}

/** Convenience: parse the anchor and resolve one cell. Prefer cellInstant in hot loops. */
export function viewerCellInstant(
  weekAnchor: string,
  d: number,
  k: number,
  viewerTz: string,
): { millis: number; nonexistent: boolean } {
  return cellInstant(viewerWeekStart(weekAnchor, viewerTz), d, k);
}

/**
 * An absolute instant → the participant's local blob coordinates. `dow` is the
 * storage day index (Mon=0..Sun=6 via blobDow); `halfHour` is the slot CONTAINING
 * the instant (sample-at-start — deterministic for fractional-offset zones).
 */
export function participantSlotAt(
  millis: number,
  participantTz: string,
): { localDate: string; dow: number; halfHour: number } {
  const local = DateTime.fromMillis(millis).setZone(participantTz);
  const localDate = local.toISODate();
  if (!localDate)
    throw new Error(`participantSlotAt: invalid instant/zone (${millis}, ${participantTz})`);
  return {
    localDate,
    dow: blobDow(local.weekday),
    halfHour: local.hour * 2 + (local.minute >= 30 ? 1 : 0),
  };
}

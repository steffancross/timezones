import { DateTime } from 'luxon';

export { DateTime };

/**
 * Get the current time in a given IANA zone.
 */
export function nowIn(iana: string): DateTime {
  return DateTime.now().setZone(iana);
}

/**
 * Get the current UTC offset for a zone, in minutes.
 * Accounts for current DST state automatically.
 */
export function currentOffset(iana: string): number {
  return DateTime.now().setZone(iana).offset;
}

/**
 * Get the offset between two zones, in minutes. Positive if `from` is ahead of `to`.
 * Example: currentOffsetBetween('Asia/Tokyo', 'America/New_York') ≈ 840 in winter
 * (Tokyo 14h ahead of EST) and ~780 in summer (13h ahead of EDT).
 */
export function currentOffsetBetween(from: string, to: string): number {
  return currentOffset(from) - currentOffset(to);
}

/**
 * Whether a zone is currently observing DST.
 */
export function isInDST(iana: string): boolean {
  return DateTime.now().setZone(iana).isInDST;
}

/**
 * Whether a zone observes DST at all (i.e., its offset changes between
 * January and July). Works for any valid IANA — useful for cities where we
 * don't have a curated `observes_dst` flag in our zones data.
 */
export function zoneObservesDst(iana: string): boolean {
  const year = DateTime.now().year;
  const jan = DateTime.fromObject({ year, month: 1, day: 15 }, { zone: iana });
  const jul = DateTime.fromObject({ year, month: 7, day: 15 }, { zone: iana });
  if (!jan.isValid || !jul.isValid) return false;
  return jan.offset !== jul.offset;
}

/**
 * Resolve an "anchor hour" in the home zone to absolute UTC instant,
 * then return the local hour in each target zone.
 *
 * @param anchorHour Hour in homeZone, 0-23
 * @param anchorDate ISO date string, e.g., '2026-05-14'
 * @param homeZone IANA of the zone the hour is expressed in
 * @param targetZones IANA list to compute hour in
 * @returns Map of iana → { hour: 0-23, date: ISO string, day_delta: -1 | 0 | 1 | 2 }
 */
export function anchorToZones(
  anchorHour: number,
  anchorDate: string,
  homeZone: string,
  targetZones: string[],
): Map<string, { hour: number; date: string; day_delta: number }> {
  const anchor = DateTime.fromISO(anchorDate, { zone: homeZone }).set({ hour: anchorHour });

  const baseDate = anchor.toISODate();
  if (!baseDate) {
    throw new Error(`Invalid anchor date: ${anchorDate} in zone ${homeZone}`);
  }

  const result = new Map<string, { hour: number; date: string; day_delta: number }>();
  for (const tz of targetZones) {
    const local = anchor.setZone(tz);
    const localDate = local.toISODate();
    if (!localDate) continue;
    const dayDelta = daysBetween(baseDate, localDate);
    result.set(tz, {
      hour: local.hour,
      date: localDate,
      day_delta: dayDelta,
    });
  }
  return result;
}

function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  const a = DateTime.fromISO(fromIsoDate, { zone: 'UTC' });
  const b = DateTime.fromISO(toIsoDate, { zone: 'UTC' });
  return Math.round(b.diff(a, 'days').days);
}

export interface ProjectedHour {
  /** Local hour 0-23 in the target zone. */
  hour: number;
  /** Local minute 0-59 (non-zero only for 30/45-min offset zones). */
  minute: number;
  /** Local ISO date in the target zone, e.g. '2026-05-14'. */
  date: string;
  /** Calendar days the local date differs from the anchor date: -1 | 0 | 1. */
  day_delta: number;
}

/**
 * Project all 24 home-zone hours of `anchorDate` into `targetIana`, returning
 * one entry per home hour (index = home hour 0-23). This is the offset-arithmetic
 * equivalent of calling `anchorToZones(h, anchorDate, homeIana, [targetIana])`
 * for every hour, but it resolves each zone's offset ~twice instead of ~24×.
 *
 * The hour/date/day_delta fields are identical to `anchorToZones` (which stays
 * the equivalence oracle in tests); `minute` is additionally exposed for the
 * 30/45-minute offset zones (e.g. +5:30, +5:45) that the strip ignores but the
 * reference table renders.
 *
 * DST-correct: on a day where either zone transitions (offset at hour 0 differs
 * from hour 23), it falls back to the exact per-hour `setZone` path so boundary
 * days stay byte-identical to the old behavior.
 */
export function projectAnchorDay(
  anchorDate: string,
  homeIana: string,
  targetIana: string,
): ProjectedHour[] {
  const home0 = DateTime.fromISO(anchorDate, { zone: homeIana }).set({ hour: 0 });
  if (!home0.isValid) {
    return Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      minute: 0,
      date: anchorDate,
      day_delta: 0,
    }));
  }

  const baseDate = home0.toISODate() ?? anchorDate;
  const home23 = home0.set({ hour: 23 });
  const t0 = home0.setZone(targetIana);
  const t23 = home23.setZone(targetIana);

  // A transition anywhere in [0,23] shifts one of these endpoint offsets, so
  // checking the endpoints of both zones is sufficient to detect a DST day.
  const isTransitionDay = home0.offset !== home23.offset || t0.offset !== t23.offset;

  if (isTransitionDay) {
    return Array.from({ length: 24 }, (_, h) => {
      const local = home0.set({ hour: h }).setZone(targetIana);
      const localDate = local.toISODate() ?? baseDate;
      return {
        hour: local.hour,
        minute: local.minute,
        date: localDate,
        day_delta: daysBetween(baseDate, localDate),
      };
    });
  }

  // Fast path: constant offset across the day → pure integer arithmetic.
  const diffMin = t0.offset - home0.offset;
  const dateForDelta = new Map<number, string>();
  const resolveDate = (delta: number): string => {
    const cached = dateForDelta.get(delta);
    if (cached !== undefined) return cached;
    const d = DateTime.fromISO(anchorDate).plus({ days: delta }).toISODate() ?? baseDate;
    dateForDelta.set(delta, d);
    return d;
  };

  return Array.from({ length: 24 }, (_, h) => {
    const total = h * 60 + diffMin;
    const hour = ((Math.floor(total / 60) % 24) + 24) % 24;
    const minute = ((total % 60) + 60) % 60;
    const day_delta = Math.floor(total / 1440);
    return { hour, minute, date: resolveDate(day_delta), day_delta };
  });
}

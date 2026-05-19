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
 * Get the current short abbreviation for a zone (e.g., 'PST' or 'PDT' depending on date).
 */
export function currentAbbreviation(iana: string): string {
  return DateTime.now().setZone(iana).toFormat('ZZZZ');
}

/**
 * Whether a zone is currently observing DST.
 */
export function isInDST(iana: string): boolean {
  return DateTime.now().setZone(iana).isInDST;
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

/**
 * Generate the 24 hour-tile entries for a single zone's strip on a given anchor date.
 * Each tile represents an hour 0-23 in that zone's local time on that date.
 */
export function dayHours(
  iana: string,
  anchorDate: string,
): Array<{
  hour: number;
  iso: string;
  isMidnight: boolean;
}> {
  const start = DateTime.fromISO(anchorDate, { zone: iana }).set({ hour: 0 });
  return Array.from({ length: 24 }, (_, i) => {
    const dt = start.plus({ hours: i });
    const iso = dt.toISO();
    return {
      hour: i,
      iso: iso ?? '',
      isMidnight: i === 0,
    };
  });
}

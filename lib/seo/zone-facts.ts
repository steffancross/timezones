import { DateTime } from 'luxon';

/**
 * Shared, evergreen offset primitives for the SEO copy generators
 * (`pair-copy`, `city-copy`). Everything keys off the IANA and a winter/summer
 * reference instant, never a live "now", so the build-time meta tags they feed
 * don't go stale at the next DST flip.
 */

/**
 * Standard- and daylight-season UTC offsets (minutes) for an IANA, sampled at a
 * winter and a summer reference instant. Season- and hemisphere-independent:
 * `jan !== jul` ⇒ the zone observes DST, and since DST always springs forward,
 * `min(jan, jul)` is the standard offset and `max(jan, jul)` the daylight one.
 */
export function seasonalOffsets(iana: string): { jan: number; jul: number } {
  const year = DateTime.now().year;
  const jan = DateTime.fromObject({ year, month: 1, day: 15 }, { zone: iana }).offset;
  const jul = DateTime.fromObject({ year, month: 7, day: 15 }, { zone: iana }).offset;
  return { jan, jul };
}

/** "10 hours", "10 hours 30 minutes", "1 hour". Input is an absolute minute count. */
export function humanizeOffset(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const hPart = h > 0 ? `${h} hour${h === 1 ? '' : 's'}` : '';
  const mPart = m > 0 ? `${m} minute${m === 1 ? '' : 's'}` : '';
  if (hPart && mPart) return `${hPart} ${mPart}`;
  return hPart || mPart || '0 hours';
}

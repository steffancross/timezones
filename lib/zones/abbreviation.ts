import { DateTime } from 'luxon';
import { getZoneByIana } from '@/data/zones';

/**
 * Current colloquial abbreviation for an IANA zone, DST-aware.
 *
 * Prefers our curated `data/zones.ts` table — its `abbreviations` array is
 * `[standard, daylight]`, so we pick the daylight entry only when the zone
 * observes DST *and* is currently in it. This is the reason a display reads
 * "BST"/"NZDT" in summer instead of "GMT"/"NZST".
 *
 * Falls back to the runtime's short offset name (`toFormat('ZZZZ')`) when the
 * zone isn't in our table. Note that for most non-North-American zones the
 * runtime has no real abbreviation and returns the "GMT±N" form — which is
 * exactly why we don't rely on it when we have curated data.
 *
 * @param iana Canonical IANA zone id, e.g. 'Europe/London'.
 * @param at   Instant to evaluate DST at; defaults to now.
 */
export function currentAbbreviation(iana: string, at: DateTime = DateTime.now()): string {
  const local = at.setZone(iana);
  const zone = getZoneByIana(iana);
  if (!zone) return local.toFormat('ZZZZ');

  const [std, dst] = zone.abbreviations;
  if (zone.observes_dst && local.isInDST && dst) return dst;
  return std ?? local.toFormat('ZZZZ');
}

/**
 * Canonical (standard-time) abbreviation for a zone — DST-agnostic.
 *
 * For stable, non-live labels like the conversions directory grid, where a
 * fixed identifier (`PST`, `GMT`, `NZST`) reads better than a value that
 * flips with the season. Still prefers our curated table and only falls back
 * to the runtime "GMT±N" form for zones we don't have.
 */
export function standardAbbreviation(iana: string): string {
  const zone = getZoneByIana(iana);
  return zone?.abbreviations[0] ?? DateTime.now().setZone(iana).toFormat('ZZZZ');
}

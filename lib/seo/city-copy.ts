import type { City } from '@/lib/cities/types';
import { seasonalOffsets } from '@/lib/seo/zone-facts';
import { formatUtcOffset } from '@/lib/zones/offset';
import { resolveZoneForIana, zoneDisplayNameForIana } from '@/lib/zones/resolve';

/**
 * Meta-description generator for the `/time-in/[city]` single-city pages.
 *
 * Query-first ("Current local time in <City>, <Country>") to match the search
 * intent, then the evergreen zone facts: human zone name, abbreviation(s), UTC
 * offset, and DST behaviour. Deliberately NO live clock — the description is
 * build-time and must not go stale; the live time lives in the page body.
 *
 * Replaces the old "Time zone: America/New_York" line: the raw IANA is a machine
 * identifier nobody searches, whereas "Eastern Time (EST/EDT), UTC-5" is exactly
 * what users type and what reads well in a SERP.
 *
 * All facts derive from the city's IANA (not a stored field) so they stay
 * correct as the tz database updates, with a graceful drop of the abbreviation
 * parenthetical for cities whose IANA has no curated zone.
 */
export function buildCityDescription(city: City): string {
  const zoneName = zoneDisplayNameForIana(city.iana);
  const abbrevs = resolveZoneForIana(city.iana)?.abbreviations ?? [];

  const { jan, jul } = seasonalOffsets(city.iana);
  const observesDst = jan !== jul;
  const stdOffset = Math.min(jan, jul);
  const dstOffset = Math.max(jan, jul);

  let zonePhrase: string;
  if (observesDst) {
    const abbrevPart = abbrevs[0] && abbrevs[1] ? ` (${abbrevs[0]}/${abbrevs[1]})` : '';
    zonePhrase = `${zoneName}${abbrevPart}, ${formatUtcOffset(stdOffset)}, or ${formatUtcOffset(dstOffset)} during daylight saving`;
  } else {
    const abbrevPart = abbrevs[0] ? ` (${abbrevs[0]})` : '';
    zonePhrase = `${zoneName}${abbrevPart}, ${formatUtcOffset(stdOffset)}, no daylight saving`;
  }

  const core = `Current local time in ${city.name}, ${city.country} — ${zonePhrase}.`;
  // Append the secondary-facts tail only when it fits the ~150-char budget; the
  // zone facts in `core` are the priority and always survive.
  const tail = ' Sunrise, sunset, and conversions.';
  return (core + tail).length <= 155 ? core + tail : core;
}

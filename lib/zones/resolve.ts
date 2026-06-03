import { getZoneByIana, getZoneById, zones } from '@/data/zones';
import { getCitiesByIana } from '@/lib/cities/resolve';
import { DateTime } from 'luxon';
import type { Zone } from './types';

export interface ResolveZoneResult {
  zone: Zone;
  matched_via: 'id' | 'iana' | 'abbreviation' | 'alias';
  /**
   * Other zones the user might have meant.
   * - For 'abbreviation' matches: the other zones whose abbreviation list also contains the input.
   * - For 'id' and 'iana' matches: the other zones in the same collision_group as the matched zone.
   * - For 'alias' matches: never populated (aliases are zone-unique by design).
   */
  ambiguous?: Zone[];
}

/**
 * Resolve user input to a zone. Returns the canonical interpretation for
 * ambiguous abbreviations (CST → America/Chicago by default).
 *
 * Try order:
 *   1. Exact zone id match ('pst')
 *   2. Exact IANA match, case-insensitive ('America/Los_Angeles')
 *   3. Abbreviation match (canonical wins, ambiguous list included)
 *   4. Search alias match
 *
 * Returns null if no match.
 */
/** Siblings of `zone` in its collision group, if any. */
function collisionSiblings(zone: Zone): Zone[] {
  if (!zone.collision_group) return [];
  return zones.filter((z) => z.id !== zone.id && z.collision_group === zone.collision_group);
}

export function resolveZone(input: string): ResolveZoneResult | null {
  if (!input) return null;

  const lower = input.toLowerCase().trim();

  // 1. Zone id slug. Surface collision_group siblings as ambiguous so that
  // queries like 'cst' (which match both the id 'cst' AND the abbreviation
  // 'CST') still expose the alternates the user might have meant.
  const byId = zones.find((z) => z.id === lower);
  if (byId) {
    const ambiguous = collisionSiblings(byId);
    return {
      zone: byId,
      matched_via: 'id',
      ambiguous: ambiguous.length > 0 ? ambiguous : undefined,
    };
  }

  // 2. IANA (case-insensitive direct compare; input is expected to use
  // the canonical IANA shape with '/' separators and '_' for word breaks).
  const byIana = zones.find((z) => z.iana.toLowerCase() === lower);
  if (byIana) {
    const ambiguous = collisionSiblings(byIana);
    return {
      zone: byIana,
      matched_via: 'iana',
      ambiguous: ambiguous.length > 0 ? ambiguous : undefined,
    };
  }

  // 3. Abbreviation
  const upper = input.toUpperCase().trim();
  const abbrevMatches = zones.filter((z) => z.abbreviations.includes(upper));
  if (abbrevMatches.length > 0) {
    const canonical = abbrevMatches.find((z) => z.is_canonical_for_collision) ?? abbrevMatches[0];
    if (canonical) {
      const ambiguous =
        abbrevMatches.length > 1 ? abbrevMatches.filter((z) => z.id !== canonical.id) : undefined;
      return { zone: canonical, matched_via: 'abbreviation', ambiguous };
    }
  }

  // 4. Search alias
  const byAlias = zones.find((z) => z.search_aliases.some((a) => a.toLowerCase() === lower));
  if (byAlias) return { zone: byAlias, matched_via: 'alias' };

  return null;
}

export { getZoneByIana, getZoneById };

/**
 * UTC offsets (minutes) at a winter and a summer reference instant. Two IANAs
 * that share BOTH have identical offset *rules* — same standard offset and same
 * DST behavior — so they're the same logical zone for naming purposes. Using two
 * fixed instants makes this season-independent (a bare "current offset" compare
 * would conflate a DST zone with a non-DST zone for half the year) and works for
 * the southern hemisphere too (the pair is compared element-wise, so inverted
 * summers still match between like zones). null for an invalid IANA.
 */
function offsetRules(iana: string): [number, number] | null {
  const year = DateTime.now().year;
  const jan = DateTime.fromObject({ year, month: 1, day: 15 }, { zone: iana });
  const jul = DateTime.fromObject({ year, month: 7, day: 15 }, { zone: iana });
  if (!jan.isValid || !jul.isValid) return null;
  return [jan.offset, jul.offset];
}

/**
 * Resolve ANY IANA zone to the curated zone the visitor is actually in, not just
 * the ~50 canonical IANAs `getZoneByIana` matches exactly. `getZoneByIana` keys
 * each zone on a single canonical IANA (CET → `Europe/Paris`, Eastern →
 * `America/New_York`), so a visitor in `Europe/Berlin` or `America/Toronto` got
 * no match and callers fell back to something unrelated.
 *
 * Try order:
 *   1. Exact canonical IANA (`Europe/Paris` → CET).
 *   2. A curated zone in the SAME COUNTRY whose offset rules match this IANA's.
 *      Country comes from the city dataset; the offset-rules filter disambiguates
 *      multi-zone countries (Toronto → Eastern, not Atlantic; Melbourne →
 *      Australian Eastern, not Central). Highest-popularity match wins ties.
 *
 * Returns null when no curated zone fits (genuinely uncurated regions) — callers
 * should then name the zone directly from the IANA (e.g. Luxon's long name)
 * rather than substituting an unrelated zone.
 *
 * Memoized: the result is a pure function of the IANA (offset rules are stable
 * for the process lifetime), and this runs per-row per-tick on the converter
 * hot path, so each IANA is resolved at most once.
 */
const ianaZoneCache = new Map<string, Zone | null>();

export function resolveZoneForIana(iana: string): Zone | null {
  const cached = ianaZoneCache.get(iana);
  if (cached !== undefined) return cached;
  const resolved = computeZoneForIana(iana);
  ianaZoneCache.set(iana, resolved);
  return resolved;
}

/**
 * Display name for ANY IANA zone, for headings and prose:
 *   1. The curated zone's `display_name` ("Pacific Time", "Central European Time").
 *   2. Else the runtime's long zone name for the IANA itself — this is what
 *      handles zones the resolver can't place onto a curated entry, e.g.
 *      `America/Phoenix` → "Mountain Standard Time" (no curated US zone has
 *      Arizona's no-DST `[-420, -420]` rules, so #1 returns null by design
 *      rather than mislabeling it as DST-observing "Mountain Time").
 *   3. Else the raw IANA, as an absolute last resort (the runtime had no name).
 *
 * `at` is the instant the long name is evaluated at (it varies with DST —
 * "Standard" vs "Daylight"); defaults to now.
 */
export function zoneDisplayNameForIana(iana: string, at: DateTime = DateTime.now()): string {
  const zone = resolveZoneForIana(iana);
  if (zone) return zone.display_name;
  return at.setZone(iana).offsetNameLong ?? iana;
}

function computeZoneForIana(iana: string): Zone | null {
  const exact = getZoneByIana(iana);
  if (exact) return exact;

  const rules = offsetRules(iana);
  if (!rules) return null;
  const sameRules = (z: Zone) => {
    const r = offsetRules(z.iana);
    return r != null && r[0] === rules[0] && r[1] === rules[1];
  };

  const country = getCitiesByIana(iana)[0]?.country_code;
  if (country) {
    const candidates = zones.filter((z) => z.countries.includes(country) && sameRules(z));
    if (candidates.length > 0) {
      return candidates.reduce((best, z) => (z.popularity > best.popularity ? z : best));
    }
  }

  return null;
}

/**
 * Lat/lng for any valid IANA. Many city IANAs (e.g. `Asia/Ho_Chi_Minh`) share
 * an offset with a canonical zone entry (`Asia/Bangkok` ICT) and aren't listed
 * directly in `data/zones.ts`. Fall back to the first city's coords for that
 * IANA so sun/night calculations still work for those rows. Returns null if
 * neither source has a match.
 */
export function getCoordsForIana(iana: string): { lat: number; lng: number } | null {
  const z = getZoneByIana(iana);
  if (z) return { lat: z.lat, lng: z.lng };
  const city = getCitiesByIana(iana)[0];
  if (city) return { lat: city.lat, lng: city.lng };
  return null;
}

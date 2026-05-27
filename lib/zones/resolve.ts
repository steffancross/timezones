import { getZoneByIana, getZoneById, zones } from '@/data/zones';
import { getCitiesByIana } from '@/lib/cities/resolve';
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

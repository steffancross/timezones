import { getCitiesByIana } from '@/lib/cities/resolve';
import { getZoneByIana } from '@/data/zones';
import type { ZoneRef } from '@/lib/store/converter';

/**
 * Default zone triples per country, keyed by ISO 3166-1 alpha-2.
 *
 * Picks: the country's primary local zone first, then two destinations a
 * typical user from that country is likely to coordinate with. Curated, not
 * mechanically derived — Google Calendar's defaults and our own intuition.
 */
const REGIONAL_DEFAULTS: Record<string, string[]> = {
  // Americas
  US: ['America/Los_Angeles', 'America/New_York', 'Europe/London'],
  CA: ['America/Toronto', 'America/New_York', 'Europe/London'],
  MX: ['America/Mexico_City', 'America/New_York', 'Europe/London'],
  BR: ['America/Sao_Paulo', 'America/New_York', 'Europe/London'],
  AR: ['America/Argentina/Buenos_Aires', 'America/New_York', 'Europe/London'],

  // Europe
  GB: ['Europe/London', 'America/New_York', 'Asia/Tokyo'],
  IE: ['Europe/Dublin', 'America/New_York', 'Asia/Tokyo'],
  DE: ['Europe/Berlin', 'America/New_York', 'Asia/Tokyo'],
  FR: ['Europe/Paris', 'America/New_York', 'Asia/Shanghai'],
  ES: ['Europe/Madrid', 'America/New_York', 'Asia/Tokyo'],
  IT: ['Europe/Rome', 'America/New_York', 'Asia/Tokyo'],
  NL: ['Europe/Amsterdam', 'America/New_York', 'Asia/Tokyo'],
  CH: ['Europe/Zurich', 'America/New_York', 'Asia/Shanghai'],
  SE: ['Europe/Stockholm', 'America/New_York', 'Asia/Tokyo'],

  // Asia
  JP: ['Asia/Tokyo', 'America/Los_Angeles', 'Europe/London'],
  KR: ['Asia/Seoul', 'America/Los_Angeles', 'Europe/London'],
  CN: ['Asia/Shanghai', 'America/Los_Angeles', 'Europe/London'],
  HK: ['Asia/Hong_Kong', 'America/New_York', 'Europe/London'],
  TW: ['Asia/Taipei', 'America/Los_Angeles', 'Europe/London'],
  SG: ['Asia/Singapore', 'America/New_York', 'Europe/London'],
  TH: ['Asia/Bangkok', 'America/New_York', 'Europe/London'],
  VN: ['Asia/Ho_Chi_Minh', 'America/Los_Angeles', 'Europe/London'],
  ID: ['Asia/Jakarta', 'America/Los_Angeles', 'Europe/London'],
  PH: ['Asia/Manila', 'America/Los_Angeles', 'Europe/London'],
  IN: ['Asia/Kolkata', 'Europe/London', 'America/New_York'],

  // Middle East
  AE: ['Asia/Dubai', 'Europe/London', 'America/New_York'],
  IL: ['Asia/Jerusalem', 'Europe/London', 'America/New_York'],
  TR: ['Europe/Istanbul', 'Europe/London', 'America/New_York'],

  // Oceania
  AU: ['Australia/Sydney', 'Asia/Singapore', 'America/Los_Angeles'],
  NZ: ['Pacific/Auckland', 'America/Los_Angeles', 'Asia/Tokyo'],

  // Africa
  ZA: ['Africa/Johannesburg', 'Europe/London', 'America/New_York'],
  EG: ['Africa/Cairo', 'Europe/London', 'America/New_York'],
  NG: ['Africa/Lagos', 'Europe/London', 'America/New_York'],
  KE: ['Africa/Nairobi', 'Europe/London', 'America/New_York'],
};

const FALLBACK = ['America/New_York', 'Europe/London', 'Asia/Tokyo'];

/**
 * Pick three IANA zones for the landing-page converter, based on Cloudflare's
 * geo headers.
 *
 * - If `detected` is a real IANA (not 'UTC' or null), it leads — the visitor's
 *   own zone goes first, then two destinations from the country's defaults
 *   (or the global fallback if the country is unmapped).
 * - If detection is missing or UTC, fall back to the country's defaults, or
 *   the global fallback as last resort.
 *
 * Always returns exactly 3 IANAs, deduplicated, with `detected` leading when
 * present.
 */
export function pickContextualZones(detected: string | null, country: string | null): string[] {
  if (detected && detected !== 'UTC') {
    const secondaries = (country ? REGIONAL_DEFAULTS[country] : undefined) ?? FALLBACK;
    const filtered = secondaries.filter((z) => z !== detected);
    return [detected, ...filtered].slice(0, 3);
  }

  const countryDefaults = country ? REGIONAL_DEFAULTS[country] : undefined;
  return countryDefaults ?? FALLBACK;
}

/**
 * Resolve an IANA zone to a home-row ref, preferring the friendlier
 * representative CITY (the most-populous city in that zone — "Berlin", "Los
 * Angeles") and falling back to the curated zone ("Pacific Time") when no city
 * exists. null if neither does, so the caller drops it.
 *
 * This is also what fixes the old homepage 500: an uncurated zone (e.g.
 * `Europe/Berlin`) used to fabricate a bogus `kind:'zone'` slug ("europe-berlin")
 * that `getZoneById` then threw on. Now it resolves to the Berlin *city*, which
 * exists in the 500-city dataset.
 */
function ianaToHomeRef(iana: string): ZoneRef | null {
  const cities = getCitiesByIana(iana);
  if (cities.length > 0) {
    const top = cities.reduce((best, c) => (c.popularity > best.popularity ? c : best));
    return { kind: 'city', slug: top.id, iana: top.iana };
  }
  const z = getZoneByIana(iana);
  return z ? { kind: 'zone', slug: z.id, iana: z.iana } : null;
}

/**
 * Contextual home rows for the landing page as friendly CITY refs (zone
 * fallback), picked from the curated `pickContextualZones` map. Rendered
 * server-side on the `force-dynamic` homepage (cf-headers are available there),
 * so the visitor lands on their relevant cities with NO client reorientation.
 */
export function pickContextualHomeRefs(detected: string | null, country: string | null): ZoneRef[] {
  return pickContextualZones(detected, country)
    .map(ianaToHomeRef)
    .filter((r): r is ZoneRef => r !== null);
}

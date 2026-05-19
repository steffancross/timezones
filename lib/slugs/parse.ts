import { getCityById, getDisambiguation } from '@/lib/cities/resolve';
import type { City } from '@/lib/cities/types';
import { resolveZone } from '@/lib/zones/resolve';
import type { Zone } from '@/lib/zones/types';

export type ZoneOrCity = { kind: 'zone'; zone: Zone } | { kind: 'city'; city: City };

/** Resolve a single slug segment to either a zone or a city. City wins ties. */
export function resolveSlugSegment(segment: string): ZoneOrCity | null {
  if (!segment) return null;
  const lower = segment.toLowerCase();

  const city = getCityById(lower);
  if (city) return { kind: 'city', city };

  const z = resolveZone(lower);
  if (z) return { kind: 'zone', zone: z.zone };

  return null;
}

export interface ParsedPair {
  from: ZoneOrCity;
  to: ZoneOrCity;
  fromIana: string;
  toIana: string;
}

/**
 * Parse a pair slug like 'pst-to-est' or 'tokyo-to-new-york'.
 * Splits on the literal '-to-' string; works because no city id contains '-to-'
 * (enforced by C4's tier-and-disambiguate guard).
 */
export function parsePairSlug(slug: string): ParsedPair | null {
  if (!slug) return null;
  const parts = slug.split('-to-');
  if (parts.length !== 2) return null;
  const [left, right] = parts;
  if (!left || !right) return null;

  const from = resolveSlugSegment(left);
  const to = resolveSlugSegment(right);
  if (!from || !to) return null;

  return {
    from,
    to,
    fromIana: from.kind === 'zone' ? from.zone.iana : from.city.iana,
    toIana: to.kind === 'zone' ? to.zone.iana : to.city.iana,
  };
}

export function isDisambiguationSlug(slug: string): boolean {
  return getDisambiguation(slug) !== null;
}

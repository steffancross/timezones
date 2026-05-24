import { zones } from '@/data/zones';
import { getAllCities } from '@/lib/cities/resolve';
import type { SearchResult } from '@/lib/search/types';
import { currentAbbreviation, currentOffset } from '@/lib/time/luxon';
import { resolveSlugSegment, type ZoneOrCity } from '@/lib/slugs/parse';

export interface Selection {
  id: string;
  kind: 'zone' | 'city';
  name: string;
  /** Short code: zone abbreviation or city IATA/abbreviation. */
  code: string;
  /** UTC offset string like "UTC−07:00". Live; recomputed at call time. */
  offsetLabel: string;
  /** Country (for cities) or "Time zone" (for zones). */
  country: string;
  iana: string;
}

function formatUtcOffset(iana: string): string {
  const minutes = currentOffset(iana);
  const sign = minutes >= 0 ? '+' : '−';
  const abs = Math.abs(minutes);
  const h = String(Math.floor(abs / 60)).padStart(2, '0');
  const m = String(abs % 60).padStart(2, '0');
  return `UTC${sign}${h}:${m}`;
}

export function selectionFromZoneOrCity(entry: ZoneOrCity): Selection {
  if (entry.kind === 'zone') {
    const z = entry.zone;
    return {
      id: z.id,
      kind: 'zone',
      name: z.display_name,
      code: z.abbreviations[0] ?? z.id.toUpperCase(),
      offsetLabel: formatUtcOffset(z.iana),
      country: 'Time zone',
      iana: z.iana,
    };
  }
  const c = entry.city;
  return {
    id: c.id,
    kind: 'city',
    name: c.name,
    code: currentAbbreviation(c.iana),
    offsetLabel: formatUtcOffset(c.iana),
    country: c.country,
    iana: c.iana,
  };
}

export function selectionFromId(id: string): Selection | null {
  const entry = resolveSlugSegment(id);
  return entry ? selectionFromZoneOrCity(entry) : null;
}

export function selectionFromSearchResult(r: SearchResult): Selection | null {
  return selectionFromId(r.slug);
}

/**
 * Server-side payload of curated zones + cities for the empty-state popover.
 * Cheap to compute (sorts already-loaded data) — recomputed per request.
 */
export interface CuratedSelections {
  zones: Selection[];
  cities: Selection[];
}

export function getCuratedSelections(): CuratedSelections {
  const z = [...zones]
    .filter((zone) => !zone.collision_group || zone.is_canonical_for_collision)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 12)
    .map((zone) => selectionFromZoneOrCity({ kind: 'zone', zone }));

  const c = getAllCities()
    .filter((city) => city.tier === 1)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 12)
    .map((city) => selectionFromZoneOrCity({ kind: 'city', city }));

  return { zones: z, cities: c };
}

export const DEFAULT_FROM_ID = 'pst';
export const DEFAULT_TO_ID = 'est';

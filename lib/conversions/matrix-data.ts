import { zones } from '@/data/zones';
import { getAllCities } from '@/lib/cities/resolve';
import { type Region, regionForCountry, regionForZone } from './regions';

export interface MatrixSource {
  id: string;
  kind: 'zone' | 'city';
  name: string;
  /** Short label rendered next to name in the sidebar (zone abbreviation or country). */
  detail: string;
  iana: string;
  region: Region;
  popularity: number;
}

/**
 * Sources for the browse matrix sidebar: all zones plus Tier 1 cities, tagged
 * with a region for filtering. Zone entries are sorted before city entries,
 * then alphabetic within each group (per spec § 08, callout 3).
 */
export function getMatrixSources(): MatrixSource[] {
  const zoneEntries: MatrixSource[] = zones.map((z) => ({
    id: z.id,
    kind: 'zone',
    name: z.display_name,
    detail: z.abbreviations[0] ?? z.id.toUpperCase(),
    iana: z.iana,
    region: regionForZone(z),
    popularity: z.popularity,
  }));

  const cityEntries: MatrixSource[] = getAllCities()
    .filter((c) => c.tier === 1)
    .map((c) => ({
      id: c.id,
      kind: 'city',
      name: c.name,
      detail: c.country,
      iana: c.iana,
      region: regionForCountry(c.country_code),
      popularity: c.popularity,
    }));

  zoneEntries.sort((a, b) => a.name.localeCompare(b.name));
  cityEntries.sort((a, b) => a.name.localeCompare(b.name));

  return [...zoneEntries, ...cityEntries];
}

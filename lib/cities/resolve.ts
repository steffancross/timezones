import citiesData from '@/data/cities.json';
import disambiguationData from '@/data/disambiguation.json';
import type { City } from './types';

const cities = citiesData as City[];
const disambiguation = disambiguationData as Record<string, string[]>;

const byId = new Map<string, City>(cities.map((c) => [c.id, c]));
const byIana = new Map<string, City[]>();
for (const c of cities) {
  const list = byIana.get(c.iana) ?? [];
  list.push(c);
  byIana.set(c.iana, list);
}

export function getCityById(id: string): City | null {
  return byId.get(id) ?? null;
}

export function getCitiesByIana(iana: string): City[] {
  return byIana.get(iana) ?? [];
}

export function getCitiesInCountry(countryCode: string): City[] {
  return cities.filter((c) => c.country_code === countryCode);
}

/**
 * Check if a slug is a disambiguation page (bare slug that resolves to multiple cities).
 * Returns the list of qualified slugs if so, otherwise null.
 */
export function getDisambiguation(slug: string): string[] | null {
  return disambiguation[slug] ?? null;
}

/**
 * Find the primary IATA-matching city for an airport code.
 * Prefer higher-tier cities first; break ties by popularity.
 */
export function getCityByIata(iata: string): City | null {
  const upper = iata.toUpperCase();
  const matches = cities
    .filter((c) => c.iata_codes.includes(upper))
    .sort((a, b) => a.tier - b.tier || b.popularity - a.popularity);
  return matches[0] ?? null;
}

export function getAllCitySlugs(): string[] {
  return cities.map((c) => c.id);
}

export function getDisambiguationSlugs(): string[] {
  return Object.keys(disambiguation);
}

export function getAllCities(): readonly City[] {
  return cities;
}

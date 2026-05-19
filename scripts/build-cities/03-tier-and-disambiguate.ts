import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CITY_TIERS, getTier } from '@/data/city-tiers';
import { COUNTRIES } from '@/lib/cities/countries';
import type { City, EnrichedCity } from '@/lib/cities/types';

const CACHE_DIR = join(import.meta.dirname, 'cache');
const IN_PATH = join(CACHE_DIR, 'cities-enriched.json');
const DATA_DIR = join(import.meta.dirname, '..', '..', 'data');
const CITIES_OUT = join(DATA_DIR, 'cities.json');
const DAB_OUT = join(DATA_DIR, 'disambiguation.json');

const TARGET_TOTAL = 500;

/**
 * Manual name overrides applied to enriched cities before grouping/slugification.
 * Use sparingly — only when the GeoNames canonical name produces a clunky slug or
 * collides poorly with established usage. Both the display `name` and the bare
 * slug derive from `ascii_name`, so we override both fields together.
 */
const NAME_OVERRIDES: Record<number, { name: string; ascii: string }> = {
  5128581: { name: 'New York', ascii: 'New York' }, // GeoNames: "New York City"
};

function applyNameOverrides(cities: EnrichedCity[]): EnrichedCity[] {
  return cities.map((c) => {
    const o = NAME_OVERRIDES[c.geonameid];
    return o ? { ...c, name: o.name, ascii_name: o.ascii } : c;
  });
}

/** True if the admin1 code is purely digits (e.g., JP prefectures, CN provinces). */
function isNumericAdmin(code: string): boolean {
  return /^\d+$/.test(code);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateBareSlug(city: EnrichedCity): string {
  return slugify(city.ascii_name);
}

function generateQualifiedSlug(city: EnrichedCity): string {
  const base = slugify(city.ascii_name);
  if (city.country_code === 'US' && city.admin1_code) {
    return `${base}-${slugify(city.admin1_code)}`;
  }
  return `${base}-${slugify(city.country_code)}`;
}

function computePopularity(city: EnrichedCity): number {
  const tier = getTier(city.geonameid);
  const tierBoost = tier === 1 ? 20 : tier === 2 ? 10 : 0;
  const popScore = Math.min(80, Math.log10(Math.max(1, city.population)) * 10);
  return Math.round(popScore + tierBoost);
}

function filterTopCities(cities: EnrichedCity[]): EnrichedCity[] {
  const tier1and2 = cities.filter((c) => getTier(c.geonameid) <= 2);
  const tier3 = cities
    .filter((c) => getTier(c.geonameid) === 3)
    .sort((a, b) => b.population - a.population);

  const tier3Quota = Math.max(0, TARGET_TOTAL - tier1and2.length);
  const top = [...tier1and2, ...tier3.slice(0, tier3Quota)];
  console.warn(
    `Selected ${top.length} cities (T1+T2: ${tier1and2.length}, T3: ${Math.min(tier3.length, tier3Quota)})`,
  );
  return top;
}

function toCity(raw: EnrichedCity, id: string): City {
  const altNames = raw.alt_names_raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && /^[\x20-\x7E]+$/.test(s)) // ASCII-printable only
    .slice(0, 4);

  return {
    id,
    name: raw.name,
    ascii_name: raw.ascii_name,
    country: COUNTRIES[raw.country_code] ?? raw.country_code,
    country_code: raw.country_code,
    // Drop purely-numeric admin codes (Japanese prefectures, Chinese provinces,
    // etc.) — they're not useful for display. US/CA postal abbreviations stay.
    admin1: raw.admin1_code && !isNumericAdmin(raw.admin1_code) ? raw.admin1_code : undefined,
    iana: raw.iana,
    lat: raw.lat,
    lng: raw.lng,
    population: raw.population,
    tier: getTier(raw.geonameid),
    alt_names: altNames,
    iata_codes: raw.iata_codes,
    popularity: computePopularity(raw),
  };
}

function resolveDisambiguation(cities: EnrichedCity[]): {
  finalCities: City[];
  disambiguationPages: Record<string, string[]>;
} {
  const groups = new Map<string, EnrichedCity[]>();
  for (const city of cities) {
    const bare = generateBareSlug(city);
    const list = groups.get(bare) ?? [];
    list.push(city);
    groups.set(bare, list);
  }

  const finalCities: City[] = [];
  const disambiguationPages: Record<string, string[]> = {};

  for (const [bare, group] of groups.entries()) {
    if (group.length === 1) {
      const only = group[0];
      if (only) finalCities.push(toCity(only, bare));
      continue;
    }

    group.sort((a, b) => b.population - a.population);
    const largest = group[0];
    const next = group[1];
    if (!largest || !next) continue;

    // Bare slug goes to the largest IF it dominates the next by 10x.
    const dominates = largest.population >= next.population * 10;

    if (dominates) {
      finalCities.push(toCity(largest, bare));
      const tail = group.slice(1);
      const slugs = uniqueQualifiedSlugs(tail);
      tail.forEach((c, i) => {
        const slug = slugs[i];
        if (slug) finalCities.push(toCity(c, slug));
      });
    } else {
      const slugs = uniqueQualifiedSlugs(group);
      group.forEach((c, i) => {
        const slug = slugs[i];
        if (slug) finalCities.push(toCity(c, slug));
      });
      disambiguationPages[bare] = [...slugs];
    }
  }

  return { finalCities, disambiguationPages };
}

/**
 * Generate qualified slugs for a group. For same-country collisions the
 * default qualifier (country code) doesn't disambiguate, so we use admin1.
 * If admin1 is numeric or also collides, fall back to a -1/-2 counter.
 */
function uniqueQualifiedSlugs(group: EnrichedCity[]): string[] {
  // Step 1: provisional slugs using the standard qualifier.
  const provisional = group.map(generateQualifiedSlug);

  // Step 2: count provisional slugs to find collisions still needing disambiguation.
  const provisionalCounts = new Map<string, number>();
  for (const s of provisional) provisionalCounts.set(s, (provisionalCounts.get(s) ?? 0) + 1);

  // Step 3: for each provisional slug that's unique, keep it. For collisions,
  // build a refined candidate: ${ascii_slug}-${admin1} when admin1 is usable.
  const refined = group.map((city, i) => {
    const prov = provisional[i] ?? '';
    if ((provisionalCounts.get(prov) ?? 0) === 1) return prov;
    const adminRaw = city.admin1_code ?? '';
    if (adminRaw && !isNumericAdmin(adminRaw)) {
      return `${slugify(city.ascii_name)}-${slugify(adminRaw)}`;
    }
    // Numeric or missing admin: leave provisional; counter pass below handles it.
    return prov;
  });

  // Step 4: counter pass — append -2, -3 ... to any remaining duplicates.
  const seen = new Map<string, number>();
  return refined.map((slug) => {
    const used = seen.get(slug) ?? 0;
    seen.set(slug, used + 1);
    return used === 0 ? slug : `${slug}-${used + 1}`;
  });
}

export async function tierAndDisambiguate(): Promise<void> {
  const enriched: EnrichedCity[] = JSON.parse(await readFile(IN_PATH, 'utf-8'));
  const overridden = applyNameOverrides(enriched);
  const filtered = filterTopCities(overridden);
  const { finalCities, disambiguationPages } = resolveDisambiguation(filtered);

  // Slug-collision guard: pair-slug uses '-to-' as separator.
  for (const c of finalCities) {
    if (c.id.includes('-to-')) {
      throw new Error(
        `City id '${c.id}' contains '-to-', which conflicts with the pair slug separator`,
      );
    }
  }

  // Sort output for stability.
  finalCities.sort((a, b) => a.id.localeCompare(b.id));

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CITIES_OUT, JSON.stringify(finalCities, null, 2));
  await writeFile(DAB_OUT, JSON.stringify(disambiguationPages, null, 2));

  console.warn(`Wrote ${finalCities.length} cities to ${CITIES_OUT}`);
  console.warn(
    `Wrote ${Object.keys(disambiguationPages).length} disambiguation pages to ${DAB_OUT}`,
  );

  // Surface a sanity stat about CITY_TIERS — useful when curated cities get
  // renamed upstream and silently drop out of the tier table.
  const seenTierIds = new Set(filtered.map((c) => c.geonameid));
  const missingTier1 = Object.entries(CITY_TIERS)
    .filter(([, t]) => t === 1)
    .map(([id]) => Number.parseInt(id, 10))
    .filter((id) => !seenTierIds.has(id));
  if (missingTier1.length > 0) {
    console.warn(`Warning: ${missingTier1.length} Tier-1 geonameids not in enriched dataset`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  tierAndDisambiguate().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

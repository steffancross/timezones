import { mkdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import MiniSearch from 'minisearch';
import citiesData from '@/data/cities.json';
import { zones } from '@/data/zones';
import type { City } from '@/lib/cities/types';
import { SEARCH_CONFIG } from '@/lib/search/config';
import type { SearchDoc } from '@/lib/search/types';

const cities = citiesData as City[];
const OUT_PATH = join(import.meta.dirname, '..', 'public', 'search-index.json');

function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${sign}${h}` : `${sign}${h}:${String(m).padStart(2, '0')}`;
}

/**
 * Continent grouping for search facets. Intentionally a small static map —
 * if a country code is missing we fall back to 'Other'. The dataset
 * (~250 ISO codes) makes this a manageable manual maintenance task.
 */
const CONTINENT: Record<string, string> = {
  US: 'North America',
  CA: 'North America',
  MX: 'North America',
  CU: 'North America',
  GB: 'Europe',
  IE: 'Europe',
  PT: 'Europe',
  FR: 'Europe',
  DE: 'Europe',
  IT: 'Europe',
  ES: 'Europe',
  NL: 'Europe',
  BE: 'Europe',
  SE: 'Europe',
  NO: 'Europe',
  DK: 'Europe',
  PL: 'Europe',
  AT: 'Europe',
  CH: 'Europe',
  FI: 'Europe',
  EE: 'Europe',
  LV: 'Europe',
  LT: 'Europe',
  GR: 'Europe',
  RO: 'Europe',
  BG: 'Europe',
  UA: 'Europe',
  CZ: 'Europe',
  HU: 'Europe',
  RS: 'Europe',
  HR: 'Europe',
  IS: 'Europe',
  RU: 'Europe',
  JP: 'Asia',
  CN: 'Asia',
  IN: 'Asia',
  SG: 'Asia',
  KR: 'Asia',
  TH: 'Asia',
  VN: 'Asia',
  KH: 'Asia',
  LA: 'Asia',
  ID: 'Asia',
  MM: 'Asia',
  HK: 'Asia',
  MO: 'Asia',
  TW: 'Asia',
  PH: 'Asia',
  MY: 'Asia',
  PK: 'Asia',
  BD: 'Asia',
  LK: 'Asia',
  NP: 'Asia',
  AF: 'Asia',
  AU: 'Oceania',
  NZ: 'Oceania',
  FJ: 'Oceania',
  BR: 'South America',
  AR: 'South America',
  CL: 'South America',
  CO: 'South America',
  PE: 'South America',
  UY: 'South America',
  VE: 'South America',
  BO: 'South America',
  PY: 'South America',
  EC: 'South America',
  PA: 'South America',
  CR: 'South America',
  EG: 'Africa',
  ZA: 'Africa',
  NG: 'Africa',
  KE: 'Africa',
  TZ: 'Africa',
  UG: 'Africa',
  ET: 'Africa',
  SD: 'Africa',
  MA: 'Africa',
  TN: 'Africa',
  DZ: 'Africa',
  GH: 'Africa',
  CI: 'Africa',
  ZM: 'Africa',
  ZW: 'Africa',
  MW: 'Africa',
  BW: 'Africa',
  CM: 'Africa',
  TD: 'Africa',
  CD: 'Africa',
  AE: 'Middle East',
  SA: 'Middle East',
  IL: 'Middle East',
  TR: 'Middle East',
  IR: 'Middle East',
  IQ: 'Middle East',
  JO: 'Middle East',
  LB: 'Middle East',
  QA: 'Middle East',
  BH: 'Middle East',
  KW: 'Middle East',
  OM: 'Middle East',
  YE: 'Middle East',
};

function continentFromCountry(code: string): string {
  return CONTINENT[code] ?? 'Other';
}

function buildDocs(): SearchDoc[] {
  const zoneDocs: SearchDoc[] = zones.map((z) => ({
    id: `zone:${z.id}`,
    type: 'zone',
    display_name: z.display_name,
    display_secondary: `${z.abbreviations[0] ?? ''} · UTC${formatOffset(z.utc_offset_std)}`,
    slug: z.id,
    iana: z.iana,
    popularity: z.popularity,
    name: z.display_name,
    alt_names: z.search_aliases.join(' '),
    abbreviations: z.abbreviations.join(' '),
    iata: '',
    country: '',
    country_code: '',
    region: z.region,
  }));

  const cityDocs: SearchDoc[] = cities.map((c) => ({
    id: `city:${c.id}`,
    type: 'city',
    display_name: c.name,
    display_secondary: c.admin1 ? `${c.admin1}, ${c.country}` : c.country,
    slug: c.id,
    iana: c.iana,
    popularity: c.popularity,
    name: c.name,
    alt_names: [...c.alt_names, c.ascii_name].filter((s) => s !== c.name).join(' '),
    abbreviations: '',
    iata: c.iata_codes.join(' '),
    country: c.country,
    country_code: c.country_code,
    region: continentFromCountry(c.country_code),
  }));

  return [...zoneDocs, ...cityDocs];
}

async function buildIndex() {
  const docs = buildDocs();
  console.warn(`Building index with ${docs.length} documents`);

  const ms = new MiniSearch(SEARCH_CONFIG);
  ms.addAll(docs);

  const serialized = ms.toJSON();
  await mkdir(join(import.meta.dirname, '..', 'public'), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(serialized));

  const info = await stat(OUT_PATH);
  console.warn(`Wrote ${OUT_PATH} (${(info.size / 1024).toFixed(1)} KB)`);
}

buildIndex().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * One-shot: fetch GeoNames countryInfo.txt and emit lib/cities/countries.ts.
 * Run manually when ISO 3166-1 changes (rare). The output is committed.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const CACHE_DIR = join(import.meta.dirname, 'cache');
const COUNTRY_URL = 'http://download.geonames.org/export/dump/countryInfo.txt';
const COUNTRY_CACHE = join(CACHE_DIR, 'countryInfo.txt');
const OUT_PATH = join(import.meta.dirname, '..', '..', 'lib', 'cities', 'countries.ts');

async function fetchCountryInfo(): Promise<string> {
  if (existsSync(COUNTRY_CACHE)) {
    console.warn('Using cached countryInfo.txt');
    return readFile(COUNTRY_CACHE, 'utf-8');
  }
  await mkdir(CACHE_DIR, { recursive: true });
  console.warn(`Downloading ${COUNTRY_URL}...`);
  const response = await fetch(COUNTRY_URL);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const text = await response.text();
  await writeFile(COUNTRY_CACHE, text);
  return text;
}

interface CountryInfo {
  name: string;
  phone?: string;
  capital?: string;
  population?: number;
}

function parse(raw: string): Record<string, CountryInfo> {
  // Tab-separated; comments start with '#'. Columns (0-based):
  // 0 ISO, 1 ISO3, 2 ISO-Numeric, 3 fips, 4 Country, 5 Capital, 6 Area,
  // 7 Population, 8 Continent, 9 tld, 10 CurrencyCode, 11 CurrencyName,
  // 12 Phone, 13 Postal Code Format, 14 Postal Code Regex, 15 Languages,
  // 16 geonameid, 17 neighbours, 18 EquivalentFipsCode
  const out: Record<string, CountryInfo> = {};
  for (const line of raw.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const cols = line.split('\t');
    const iso = cols[0];
    const name = cols[4];
    if (!iso || !name) continue;
    const capital = cols[5]?.trim();
    const phone = cols[12]?.trim();
    const population = Number.parseInt(cols[7]?.trim() ?? '', 10);
    out[iso] = {
      name,
      ...(phone ? { phone } : {}),
      ...(capital ? { capital } : {}),
      ...(Number.isFinite(population) && population > 0 ? { population } : {}),
    };
  }
  return out;
}

function emit(map: Record<string, CountryInfo>): string {
  const entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  const body = entries.map(([code, info]) => `  ${code}: ${JSON.stringify(info)},`).join('\n');
  return `/**
 * ISO 3166-1 alpha-2 country metadata.
 * Generated from GeoNames countryInfo.txt by scripts/build-cities/00-fetch-countries.ts.
 */
export interface CountryInfo {
  name: string;
  /** International dialing code, e.g. '49' or '1-242' (no leading '+'). */
  phone?: string;
  capital?: string;
  population?: number;
}

export const COUNTRY_INFO: Record<string, CountryInfo> = {
${body}
};

/** ISO 3166-1 alpha-2 country code → English name (derived from COUNTRY_INFO). */
export const COUNTRIES: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_INFO).map(([code, info]) => [code, info.name]),
);
`;
}

async function main() {
  const raw = await fetchCountryInfo();
  const map = parse(raw);
  const ts = emit(map);
  await mkdir(join(import.meta.dirname, '..', '..', 'lib', 'cities'), { recursive: true });
  await writeFile(OUT_PATH, ts);
  console.warn(`Wrote ${OUT_PATH} (${Object.keys(map).length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

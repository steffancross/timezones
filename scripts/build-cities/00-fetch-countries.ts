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

function parse(raw: string): Record<string, string> {
  // Tab-separated; comments start with '#'. Columns:
  // ISO, ISO3, ISO-Numeric, fips, Country, Capital, Area, Population, Continent, tld,
  // CurrencyCode, CurrencyName, Phone, Postal Code Format, Postal Code Regex,
  // Languages, geonameid, neighbours, EquivalentFipsCode
  const out: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const cols = line.split('\t');
    const iso = cols[0];
    const name = cols[4];
    if (iso && name) out[iso] = name;
  }
  return out;
}

function emit(map: Record<string, string>): string {
  const entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  const body = entries.map(([code, name]) => `  ${code}: ${JSON.stringify(name)},`).join('\n');
  return `/**
 * ISO 3166-1 alpha-2 country code → English name.
 * Generated from GeoNames countryInfo.txt by scripts/build-cities/00-fetch-countries.ts.
 */
export const COUNTRIES: Record<string, string> = {
${body}
};
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

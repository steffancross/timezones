import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import AdmZip from 'adm-zip';
import type { RawCity } from '@/lib/cities/types';

const CACHE_DIR = join(import.meta.dirname, 'cache');
const ZIP_URL = 'http://download.geonames.org/export/dump/cities15000.zip';
const ZIP_PATH = join(CACHE_DIR, 'cities15000.zip');
const TXT_PATH = join(CACHE_DIR, 'cities15000.txt');
const OUT_PATH = join(CACHE_DIR, 'cities-raw.json');

async function ensureCache() {
  if (!existsSync(CACHE_DIR)) await mkdir(CACHE_DIR, { recursive: true });
}

async function downloadIfNeeded() {
  if (existsSync(TXT_PATH)) {
    console.warn('Using cached cities15000.txt');
    return;
  }

  console.warn(`Downloading ${ZIP_URL}...`);
  const response = await fetch(ZIP_URL);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(ZIP_PATH, buffer);

  console.warn('Extracting...');
  const zip = new AdmZip(ZIP_PATH);
  zip.extractAllTo(CACHE_DIR, true);
}

async function parse(): Promise<RawCity[]> {
  const raw = await readFile(TXT_PATH, 'utf-8');
  const lines = raw.split('\n').filter((l) => l.trim());

  // GeoNames cities15000.txt is a tab-separated file with 19 columns:
  // geonameid, name, asciiname, alternatenames, latitude, longitude,
  // feature_class, feature_code, country_code, cc2, admin1_code,
  // admin2_code, admin3_code, admin4_code, population, elevation, dem,
  // timezone, modification_date
  const cities: RawCity[] = [];

  for (const line of lines) {
    const cols = line.split('\t');
    if (cols.length < 18) continue;

    const featureClass = cols[6];
    if (featureClass !== 'P') continue; // Populated places only

    const population = Number.parseInt(cols[14] ?? '0', 10);
    if (population < 15000) continue;

    cities.push({
      geonameid: Number.parseInt(cols[0] ?? '0', 10),
      name: cols[1] ?? '',
      ascii_name: cols[2] ?? '',
      alt_names_raw: cols[3] ?? '',
      lat: Number.parseFloat(cols[4] ?? '0'),
      lng: Number.parseFloat(cols[5] ?? '0'),
      feature_class: cols[6] ?? '',
      feature_code: cols[7] ?? '',
      country_code: cols[8] ?? '',
      admin1_code: cols[10] ?? '',
      population,
      iana: cols[17] ?? '',
    });
  }

  console.warn(`Parsed ${cities.length} cities`);
  return cities;
}

export async function fetchAndParseGeonames(): Promise<RawCity[]> {
  await ensureCache();
  await downloadIfNeeded();
  const cities = await parse();
  await writeFile(OUT_PATH, JSON.stringify(cities, null, 2));
  console.warn(`Wrote ${OUT_PATH}`);
  return cities;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchAndParseGeonames().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

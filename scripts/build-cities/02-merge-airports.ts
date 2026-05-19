import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseCsv } from 'csv-parse/sync';
import type { EnrichedCity, RawAirport, RawCity } from '@/lib/cities/types';

const CACHE_DIR = join(import.meta.dirname, 'cache');
const AIRPORTS_URL = 'https://raw.githubusercontent.com/mwgg/Airports/master/airports.json';
const AIRPORTS_CACHE = join(CACHE_DIR, 'airports-raw.json');
const OURAIRPORTS_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const OURAIRPORTS_CACHE = join(CACHE_DIR, 'ourairports.csv');
const COMMERCIAL_IATA_CACHE = join(CACHE_DIR, 'commercial-iatas.json');
const CITIES_IN = join(CACHE_DIR, 'cities-raw.json');
const OUT_PATH = join(CACHE_DIR, 'cities-enriched.json');

/** Airport types from OurAirports that represent real passenger airports. */
const COMMERCIAL_TYPES = new Set(['large_airport', 'medium_airport']);

/** mwgg/Airports record shape (uses `lon`, not `lng`; empty-string iata for non-commercial). */
interface MwggAirport {
  icao: string;
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  tz: string;
}

function normalizeAirports(data: Record<string, MwggAirport>): RawAirport[] {
  return Object.values(data).map((a) => ({
    icao: a.icao,
    iata: a.iata || null,
    name: a.name,
    city: a.city,
    country: a.country,
    lat: a.lat,
    lng: a.lon,
    tz: a.tz,
  }));
}

async function fetchAirports(): Promise<RawAirport[]> {
  if (existsSync(AIRPORTS_CACHE)) {
    console.warn('Using cached airports-raw.json');
    const raw = JSON.parse(await readFile(AIRPORTS_CACHE, 'utf-8'));
    return normalizeAirports(raw);
  }

  console.warn(`Downloading ${AIRPORTS_URL}...`);
  const response = await fetch(AIRPORTS_URL);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);

  const data = (await response.json()) as Record<string, MwggAirport>;
  await writeFile(AIRPORTS_CACHE, JSON.stringify(data));

  return normalizeAirports(data);
}

/**
 * Fetch OurAirports CSV and return the set of IATA codes that belong to
 * large/medium commercial airports with scheduled service. Used to filter
 * mwgg's catalog (which includes heliports, military airfields, GA strips,
 * seaplane bases) down to airports a traveler would actually recognize.
 */
async function fetchCommercialIatas(): Promise<Set<string>> {
  if (existsSync(COMMERCIAL_IATA_CACHE)) {
    console.warn('Using cached commercial-iatas.json');
    const arr = JSON.parse(await readFile(COMMERCIAL_IATA_CACHE, 'utf-8')) as string[];
    return new Set(arr);
  }

  let csv: string;
  if (existsSync(OURAIRPORTS_CACHE)) {
    console.warn('Using cached ourairports.csv');
    csv = await readFile(OURAIRPORTS_CACHE, 'utf-8');
  } else {
    console.warn(`Downloading ${OURAIRPORTS_URL}...`);
    const response = await fetch(OURAIRPORTS_URL);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    csv = await response.text();
    await writeFile(OURAIRPORTS_CACHE, csv);
  }

  const rows = parseCsv(csv, { columns: true, skip_empty_lines: true }) as Array<{
    type: string;
    iata_code: string;
    scheduled_service: string;
  }>;

  const iatas = new Set<string>();
  for (const r of rows) {
    if (!r.iata_code || r.iata_code.length !== 3) continue;
    if (!COMMERCIAL_TYPES.has(r.type)) continue;
    if (r.scheduled_service !== 'yes') continue;
    iatas.add(r.iata_code.toUpperCase());
  }

  await writeFile(COMMERCIAL_IATA_CACHE, JSON.stringify([...iatas].sort()));
  console.warn(`Identified ${iatas.size} commercial IATA codes`);
  return iatas;
}

/**
 * Match airports to cities using IANA timezone + coordinate proximity + city name as tiebreaker.
 * Airports are pre-filtered to commercial passenger airports (via OurAirports)
 * to keep regional GA strips and military airfields out of the IATA lists.
 */
function matchAirportsToCities(
  cities: RawCity[],
  airports: RawAirport[],
  commercialIatas: Set<string>,
): EnrichedCity[] {
  const airportsWithIata = airports.filter(
    (a) => a.iata && a.iata.length === 3 && commercialIatas.has(a.iata.toUpperCase()),
  );

  const airportsByIana = new Map<string, RawAirport[]>();
  for (const airport of airportsWithIata) {
    const list = airportsByIana.get(airport.tz) ?? [];
    list.push(airport);
    airportsByIana.set(airport.tz, list);
  }

  return cities.map((city): EnrichedCity => {
    const candidates = airportsByIana.get(city.iana) ?? [];

    // Bounding-box proximity check, ~50km
    const LAT_TOLERANCE = 50 / 111;
    const lngTolerance = 50 / (111 * Math.cos((city.lat * Math.PI) / 180));

    const cityNameLower = city.name.toLowerCase();
    const cityNameAsciiLower = city.ascii_name.toLowerCase();

    // Union of two heuristics: any airport whose `city` field matches OR
    // any airport within ~50km. Either signal is good enough; together they
    // catch faraway-but-named airports (e.g. NRT for Tokyo) and unnamed-but-near
    // airports (e.g. EWR labelled "Newark" but near NYC).
    const matchedIatas = new Set<string>();
    for (const a of candidates) {
      const acl = a.city.toLowerCase();
      const nameMatch = acl === cityNameLower || acl === cityNameAsciiLower;
      const nearby =
        Math.abs(a.lat - city.lat) < LAT_TOLERANCE && Math.abs(a.lng - city.lng) < lngTolerance;
      if (nameMatch || nearby) {
        matchedIatas.add(a.iata as string);
      }
    }

    return {
      ...city,
      iata_codes: [...matchedIatas].sort(),
    };
  });
}

export async function mergeAirports(cities: RawCity[]): Promise<EnrichedCity[]> {
  await mkdir(CACHE_DIR, { recursive: true });
  const [airports, commercialIatas] = await Promise.all([fetchAirports(), fetchCommercialIatas()]);
  const enriched = matchAirportsToCities(cities, airports, commercialIatas);
  await writeFile(OUT_PATH, JSON.stringify(enriched, null, 2));

  const withIata = enriched.filter((c) => c.iata_codes.length > 0);
  console.warn(`Enriched ${enriched.length} cities; ${withIata.length} have IATA codes`);
  return enriched;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  readFile(CITIES_IN, 'utf-8')
    .then((raw) => mergeAirports(JSON.parse(raw)))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

/**
 * One-shot: look up GeoNames IDs for the Tier 1/2 cities listed in C4 and
 * emit data/city-tiers.ts. Run this manually after a GeoNames refresh if
 * curated cities have new IDs (rare).
 *
 * Picks the highest-population candidate for each (name, country_code) tuple
 * to avoid grabbing tiny municipalities that share the same name.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { EnrichedCity } from '@/lib/cities/types';

const CITIES_IN = join(import.meta.dirname, 'cache', 'cities-enriched.json');
const OUT_PATH = join(import.meta.dirname, '..', '..', 'data', 'city-tiers.ts');

interface Target {
  name: string;
  cc: string;
  alt?: string[];
}

const TIER_1: Target[] = [
  { name: 'New York City', cc: 'US', alt: ['New York'] },
  { name: 'Los Angeles', cc: 'US' },
  { name: 'Chicago', cc: 'US' },
  { name: 'San Francisco', cc: 'US' },
  { name: 'Miami', cc: 'US' },
  { name: 'Washington', cc: 'US', alt: ['Washington, D.C.'] },
  { name: 'Toronto', cc: 'CA' },
  { name: 'Vancouver', cc: 'CA' },
  { name: 'Mexico City', cc: 'MX', alt: ['Ciudad de México'] },
  { name: 'London', cc: 'GB' },
  { name: 'Paris', cc: 'FR' },
  { name: 'Berlin', cc: 'DE' },
  { name: 'Madrid', cc: 'ES' },
  { name: 'Rome', cc: 'IT' },
  { name: 'Amsterdam', cc: 'NL' },
  { name: 'Frankfurt am Main', cc: 'DE', alt: ['Frankfurt'] },
  { name: 'Zurich', cc: 'CH', alt: ['Zürich'] },
  { name: 'Stockholm', cc: 'SE' },
  { name: 'Moscow', cc: 'RU' },
  { name: 'Istanbul', cc: 'TR' },
  { name: 'Dubai', cc: 'AE' },
  { name: 'Cairo', cc: 'EG' },
  { name: 'Lagos', cc: 'NG' },
  { name: 'Johannesburg', cc: 'ZA' },
  { name: 'Nairobi', cc: 'KE' },
  { name: 'Mumbai', cc: 'IN' },
  { name: 'Delhi', cc: 'IN', alt: ['New Delhi'] },
  { name: 'Bangalore', cc: 'IN', alt: ['Bengaluru'] },
  { name: 'Bangkok', cc: 'TH' },
  { name: 'Singapore', cc: 'SG' },
  { name: 'Hong Kong', cc: 'HK' },
  { name: 'Shanghai', cc: 'CN' },
  { name: 'Beijing', cc: 'CN' },
  { name: 'Seoul', cc: 'KR' },
  { name: 'Tokyo', cc: 'JP' },
  { name: 'Osaka', cc: 'JP' },
  { name: 'Manila', cc: 'PH' },
  { name: 'Jakarta', cc: 'ID' },
  { name: 'Kuala Lumpur', cc: 'MY' },
  { name: 'Sydney', cc: 'AU' },
  { name: 'Melbourne', cc: 'AU' },
  { name: 'Auckland', cc: 'NZ' },
  { name: 'São Paulo', cc: 'BR', alt: ['Sao Paulo'] },
  { name: 'Buenos Aires', cc: 'AR' },
  { name: 'Rio de Janeiro', cc: 'BR' },
  { name: 'Bogotá', cc: 'CO', alt: ['Bogota'] },
  { name: 'Lima', cc: 'PE' },
  { name: 'Santiago', cc: 'CL' },
  { name: 'Tel Aviv', cc: 'IL', alt: ['Tel Aviv-Yafo'] },
  { name: 'Riyadh', cc: 'SA' },
];

const TIER_2: Target[] = [
  // US — major regional
  { name: 'Seattle', cc: 'US' },
  { name: 'Boston', cc: 'US' },
  { name: 'Atlanta', cc: 'US' },
  { name: 'Dallas', cc: 'US' },
  { name: 'Houston', cc: 'US' },
  { name: 'Phoenix', cc: 'US' },
  { name: 'Philadelphia', cc: 'US' },
  { name: 'San Diego', cc: 'US' },
  { name: 'Austin', cc: 'US' },
  { name: 'Denver', cc: 'US' },
  { name: 'Portland', cc: 'US' },
  { name: 'Las Vegas', cc: 'US' },
  { name: 'Minneapolis', cc: 'US' },
  { name: 'Detroit', cc: 'US' },
  { name: 'Nashville', cc: 'US' },
  { name: 'Charlotte', cc: 'US' },
  { name: 'Baltimore', cc: 'US' },
  { name: 'Pittsburgh', cc: 'US' },
  { name: 'St. Louis', cc: 'US' },
  { name: 'Tampa', cc: 'US' },
  { name: 'Orlando', cc: 'US' },
  { name: 'San Jose', cc: 'US' },
  { name: 'Sacramento', cc: 'US' },
  { name: 'Salt Lake City', cc: 'US' },
  { name: 'Honolulu', cc: 'US' },
  { name: 'Anchorage', cc: 'US' },
  { name: 'Boise', cc: 'US' },
  { name: 'Indianapolis', cc: 'US' },
  { name: 'Cleveland', cc: 'US' },
  { name: 'Kansas City', cc: 'US' },
  { name: 'New Orleans', cc: 'US' },
  // Canada
  { name: 'Montreal', cc: 'CA', alt: ['Montréal'] },
  { name: 'Calgary', cc: 'CA' },
  { name: 'Ottawa', cc: 'CA' },
  { name: 'Edmonton', cc: 'CA' },
  { name: 'Halifax', cc: 'CA' },
  // Latin America
  { name: 'Monterrey', cc: 'MX' },
  { name: 'Guadalajara', cc: 'MX' },
  { name: 'Cancún', cc: 'MX', alt: ['Cancun'] },
  { name: 'Havana', cc: 'CU' },
  { name: 'Panama City', cc: 'PA', alt: ['Panamá'] },
  { name: 'San José', cc: 'CR', alt: ['San Jose'] },
  { name: 'Quito', cc: 'EC' },
  { name: 'Caracas', cc: 'VE' },
  { name: 'Montevideo', cc: 'UY' },
  { name: 'La Paz', cc: 'BO' },
  { name: 'Asunción', cc: 'PY', alt: ['Asuncion'] },
  { name: 'Brasília', cc: 'BR', alt: ['Brasilia'] },
  { name: 'Salvador', cc: 'BR' },
  { name: 'Belo Horizonte', cc: 'BR' },
  { name: 'Medellín', cc: 'CO', alt: ['Medellin'] },
  // UK/Ireland
  { name: 'Dublin', cc: 'IE' },
  { name: 'Manchester', cc: 'GB' },
  { name: 'Edinburgh', cc: 'GB' },
  { name: 'Glasgow', cc: 'GB' },
  { name: 'Birmingham', cc: 'GB' },
  { name: 'Belfast', cc: 'GB' },
  // Western Europe
  { name: 'Lisbon', cc: 'PT', alt: ['Lisboa'] },
  { name: 'Barcelona', cc: 'ES' },
  { name: 'Milan', cc: 'IT', alt: ['Milano'] },
  { name: 'Naples', cc: 'IT', alt: ['Napoli'] },
  { name: 'Venice', cc: 'IT', alt: ['Venezia'] },
  { name: 'Florence', cc: 'IT', alt: ['Firenze'] },
  { name: 'Munich', cc: 'DE', alt: ['München'] },
  { name: 'Hamburg', cc: 'DE' },
  { name: 'Cologne', cc: 'DE', alt: ['Köln'] },
  { name: 'Stuttgart', cc: 'DE' },
  { name: 'Vienna', cc: 'AT', alt: ['Wien'] },
  { name: 'Brussels', cc: 'BE', alt: ['Bruxelles'] },
  { name: 'Geneva', cc: 'CH', alt: ['Genève'] },
  { name: 'Bern', cc: 'CH' },
  { name: 'Lyon', cc: 'FR' },
  { name: 'Marseille', cc: 'FR' },
  { name: 'Nice', cc: 'FR' },
  { name: 'Rotterdam', cc: 'NL' },
  // Nordic
  { name: 'Oslo', cc: 'NO' },
  { name: 'Copenhagen', cc: 'DK', alt: ['København'] },
  { name: 'Helsinki', cc: 'FI' },
  { name: 'Reykjavík', cc: 'IS', alt: ['Reykjavik'] },
  // Eastern Europe
  { name: 'Warsaw', cc: 'PL', alt: ['Warszawa'] },
  { name: 'Prague', cc: 'CZ', alt: ['Praha'] },
  { name: 'Budapest', cc: 'HU' },
  { name: 'Bucharest', cc: 'RO', alt: ['București'] },
  { name: 'Athens', cc: 'GR', alt: ['Athína'] },
  { name: 'Sofia', cc: 'BG' },
  { name: 'Belgrade', cc: 'RS', alt: ['Beograd'] },
  { name: 'Zagreb', cc: 'HR' },
  { name: 'Kiev', cc: 'UA', alt: ['Kyiv'] },
  { name: 'St. Petersburg', cc: 'RU', alt: ['Saint Petersburg', 'Sankt-Peterburg'] },
  // Asia
  { name: 'Kolkata', cc: 'IN', alt: ['Calcutta'] },
  { name: 'Chennai', cc: 'IN' },
  { name: 'Hyderabad', cc: 'IN' },
  { name: 'Pune', cc: 'IN' },
  { name: 'Ahmedabad', cc: 'IN' },
  { name: 'Karachi', cc: 'PK' },
  { name: 'Lahore', cc: 'PK' },
  { name: 'Islamabad', cc: 'PK' },
  { name: 'Dhaka', cc: 'BD' },
  { name: 'Colombo', cc: 'LK' },
  { name: 'Kathmandu', cc: 'NP' },
  { name: 'Hanoi', cc: 'VN', alt: ['Hà Nội'] },
  { name: 'Ho Chi Minh City', cc: 'VN' },
  { name: 'Phnom Penh', cc: 'KH' },
  { name: 'Yangon', cc: 'MM' },
  { name: 'Surabaya', cc: 'ID' },
  { name: 'Bandung', cc: 'ID' },
  { name: 'Cebu City', cc: 'PH' },
  { name: 'Davao', cc: 'PH' },
  { name: 'Taipei', cc: 'TW' },
  { name: 'Kaohsiung', cc: 'TW' },
  { name: 'Shenzhen', cc: 'CN' },
  { name: 'Guangzhou', cc: 'CN' },
  { name: 'Chengdu', cc: 'CN' },
  { name: 'Chongqing', cc: 'CN' },
  { name: 'Hangzhou', cc: 'CN' },
  { name: 'Wuhan', cc: 'CN' },
  { name: 'Xi’an', cc: 'CN', alt: ['Xi’an', 'Xian', "Xi'an"] },
  { name: 'Macau', cc: 'MO', alt: ['Macao'] },
  { name: 'Busan', cc: 'KR' },
  { name: 'Incheon', cc: 'KR' },
  { name: 'Nagoya', cc: 'JP' },
  { name: 'Yokohama', cc: 'JP' },
  { name: 'Sapporo', cc: 'JP' },
  { name: 'Fukuoka', cc: 'JP' },
  { name: 'Kyoto', cc: 'JP' },
  // Middle East
  { name: 'Abu Dhabi', cc: 'AE' },
  { name: 'Doha', cc: 'QA' },
  { name: 'Kuwait City', cc: 'KW', alt: ['Kuwait'] },
  { name: 'Manama', cc: 'BH' },
  { name: 'Muscat', cc: 'OM' },
  { name: 'Amman', cc: 'JO' },
  { name: 'Beirut', cc: 'LB' },
  { name: 'Jerusalem', cc: 'IL' },
  { name: 'Tehran', cc: 'IR' },
  { name: 'Baghdad', cc: 'IQ' },
  { name: 'Ankara', cc: 'TR' },
  // Africa
  { name: 'Cape Town', cc: 'ZA' },
  { name: 'Durban', cc: 'ZA' },
  { name: 'Pretoria', cc: 'ZA' },
  { name: 'Casablanca', cc: 'MA' },
  { name: 'Marrakesh', cc: 'MA', alt: ['Marrakech'] },
  { name: 'Tunis', cc: 'TN' },
  { name: 'Algiers', cc: 'DZ' },
  { name: 'Accra', cc: 'GH' },
  { name: 'Addis Ababa', cc: 'ET' },
  { name: 'Dar es Salaam', cc: 'TZ' },
  { name: 'Kampala', cc: 'UG' },
  { name: 'Khartoum', cc: 'SD' },
  { name: 'Abidjan', cc: 'CI' },
  // Oceania
  { name: 'Brisbane', cc: 'AU' },
  { name: 'Perth', cc: 'AU' },
  { name: 'Adelaide', cc: 'AU' },
  { name: 'Canberra', cc: 'AU' },
  { name: 'Wellington', cc: 'NZ' },
  { name: 'Christchurch', cc: 'NZ' },
  { name: 'Suva', cc: 'FJ' },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function lookup(cities: EnrichedCity[], target: Target): EnrichedCity | undefined {
  const names = [target.name, ...(target.alt ?? [])].map(normalize);
  const matches = cities
    .filter((c) => c.country_code === target.cc)
    .filter((c) => names.includes(normalize(c.name)) || names.includes(normalize(c.ascii_name)));
  if (matches.length === 0) return undefined;
  // Tie-break by population (highest first) to avoid grabbing small same-named towns.
  matches.sort((a, b) => b.population - a.population);
  return matches[0];
}

async function main() {
  const cities: EnrichedCity[] = JSON.parse(await readFile(CITIES_IN, 'utf-8'));

  const t1: { city: EnrichedCity; label: string }[] = [];
  const t2: { city: EnrichedCity; label: string }[] = [];
  const missing: string[] = [];

  for (const t of TIER_1) {
    const hit = lookup(cities, t);
    if (hit) t1.push({ city: hit, label: t.name });
    else missing.push(`T1: ${t.name} (${t.cc})`);
  }
  for (const t of TIER_2) {
    const hit = lookup(cities, t);
    if (hit) t2.push({ city: hit, label: t.name });
    else missing.push(`T2: ${t.name} (${t.cc})`);
  }

  if (missing.length > 0) {
    console.warn('Missing cities (will be silently dropped from tiers):');
    for (const m of missing) console.warn(`  - ${m}`);
  }

  const tier1Lines = t1.map(
    ({ city, label }) => `  ${city.geonameid}: 1, // ${label} (${city.country_code})`,
  );
  const tier2Lines = t2.map(
    ({ city, label }) => `  ${city.geonameid}: 2, // ${label} (${city.country_code})`,
  );

  const out = `/**
 * Hand-curated tier assignments. Lookup key is the GeoNames ID for stability
 * across data refreshes. Generated by scripts/build-cities/lookup-tier-ids.ts.
 *
 * Tier 1: Major global cities — full pair-page generation against Tier 1 + 2
 * Tier 2: Major regional cities — only paired with Tier 1
 * Tier 3: Everything else (default).
 */
export const CITY_TIERS: Record<number, 1 | 2 | 3> = {
  // ===== Tier 1 (${t1.length} entries) =====
${tier1Lines.join('\n')}

  // ===== Tier 2 (${t2.length} entries) =====
${tier2Lines.join('\n')}
};

export function getTier(geonameid: number): 1 | 2 | 3 {
  return CITY_TIERS[geonameid] ?? 3;
}
`;

  await mkdir(join(import.meta.dirname, '..', '..', 'data'), { recursive: true });
  await writeFile(OUT_PATH, out);
  console.warn(`Wrote ${OUT_PATH} (T1=${t1.length}, T2=${t2.length})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

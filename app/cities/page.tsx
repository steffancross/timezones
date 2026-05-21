import Link from 'next/link';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { getAllCities } from '@/lib/cities/resolve';
import type { City } from '@/lib/cities/types';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Cities',
  description:
    'Browse current local time in cities around the world. ~500 cities organized by region.',
  path: '/cities',
});

const COUNTRY_REGION: Record<string, string> = {
  US: 'North America',
  CA: 'North America',
  MX: 'North America',
  GB: 'Europe',
  IE: 'Europe',
  DE: 'Europe',
  FR: 'Europe',
  IT: 'Europe',
  ES: 'Europe',
  NL: 'Europe',
  BE: 'Europe',
  CH: 'Europe',
  AT: 'Europe',
  SE: 'Europe',
  NO: 'Europe',
  DK: 'Europe',
  PL: 'Europe',
  PT: 'Europe',
  CZ: 'Europe',
  HU: 'Europe',
  GR: 'Europe',
  FI: 'Europe',
  RO: 'Europe',
  RU: 'Europe',
  UA: 'Europe',
  JP: 'Asia',
  CN: 'Asia',
  KR: 'Asia',
  IN: 'Asia',
  SG: 'Asia',
  TH: 'Asia',
  VN: 'Asia',
  ID: 'Asia',
  PH: 'Asia',
  HK: 'Asia',
  TW: 'Asia',
  MY: 'Asia',
  AE: 'Middle East',
  SA: 'Middle East',
  IL: 'Middle East',
  TR: 'Middle East',
  AU: 'Oceania',
  NZ: 'Oceania',
  BR: 'South America',
  AR: 'South America',
  CL: 'South America',
  PE: 'South America',
  CO: 'South America',
  ZA: 'Africa',
  EG: 'Africa',
  NG: 'Africa',
  KE: 'Africa',
  MA: 'Africa',
};

function groupByRegion(cities: readonly City[]): Record<string, City[]> {
  const groups: Record<string, City[]> = {};
  for (const c of cities) {
    const region = COUNTRY_REGION[c.country_code] ?? 'Other';
    if (!groups[region]) groups[region] = [];
    groups[region].push(c);
  }
  return groups;
}

export default function CitiesIndex() {
  const cities = getAllCities();
  const groups = groupByRegion(cities);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cities' }]} />

      <header className="mt-3 mb-8">
        <h1 className="text-3xl font-semibold">Cities</h1>
        <p className="mt-2 text-muted-foreground">
          Current local time for {cities.length} cities worldwide.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">Major cities</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {cities
            .filter((c) => c.tier === 1)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((c) => (
              <li key={c.id}>
                <Link
                  href={`/time-in/${c.id}`}
                  className="block rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
                >
                  {c.name}
                </Link>
              </li>
            ))}
        </ul>
      </section>

      {Object.entries(groups).map(([region, list]) => (
        <section key={region} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">{region}</h2>
          <ul className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3 md:grid-cols-4">
            {list
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/time-in/${c.id}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {c.name}
                    {c.admin1 ? <span className="text-xs"> ({c.admin1})</span> : null}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

import Link from 'next/link';
import { getCitiesByIana } from '@/lib/cities/resolve';
import type { City } from '@/lib/cities/types';
import type { ParsedPair, ZoneOrCity } from '@/lib/slugs/parse';
import { getZoneByIana } from '@/lib/zones/resolve';

interface Props {
  pair: ParsedPair;
}

const MAX_PER_SIDE = 8;

function citiesForSide(zoc: ZoneOrCity): City[] {
  const iana = zoc.kind === 'zone' ? zoc.zone.iana : zoc.city.iana;
  const all = getCitiesByIana(iana);
  // For a city ref, exclude that city itself — "other cities in your zone".
  const filtered = zoc.kind === 'city' ? all.filter((c) => c.id !== zoc.city.id) : all;
  return [...filtered].sort((a, b) => b.population - a.population).slice(0, MAX_PER_SIDE);
}

function zoneDisplayName(zoc: ZoneOrCity): string {
  if (zoc.kind === 'zone') return zoc.zone.display_name;
  return getZoneByIana(zoc.city.iana)?.display_name ?? zoc.city.iana;
}

function sideTitle(zoc: ZoneOrCity): string {
  const name = zoneDisplayName(zoc);
  return zoc.kind === 'zone' ? `Cities in ${name}` : `Other cities in ${name}`;
}

export function PairCities({ pair }: Props) {
  const fromCities = citiesForSide(pair.from);
  const toCities = citiesForSide(pair.to);
  if (fromCities.length === 0 && toCities.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-semibold">Cities in these zones</h2>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <CityColumn title={sideTitle(pair.from)} cities={fromCities} />
        <CityColumn title={sideTitle(pair.to)} cities={toCities} />
      </div>
    </section>
  );
}

function CityColumn({ title, cities }: { title: string; cities: City[] }) {
  if (cities.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {cities.map((c) => (
          <li key={c.id}>
            <Link
              href={`/time-in/${c.id}`}
              className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[color:var(--border)] bg-card px-3 py-1.5 text-sm hover:bg-[var(--hover)]"
            >
              <span>{c.name}</span>
              <span className="font-mono text-[10px] uppercase text-[color:var(--fg-muted)]">
                {c.country_code}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { getCitiesByIana } from '@/lib/cities/resolve';
import type { ParsedPair, ZoneOrCity } from '@/lib/slugs/parse';
import { getZoneByIana } from '@/lib/zones/resolve';

interface Props {
  pair: ParsedPair;
}

interface Airport {
  code: string;
  cityName: string;
}

const MAX_PER_SIDE = 10;

function airportsForSide(zoc: ZoneOrCity): Airport[] {
  const iana = zoc.kind === 'zone' ? zoc.zone.iana : zoc.city.iana;
  const sorted = [...getCitiesByIana(iana)].sort((a, b) => b.population - a.population);

  const out: Airport[] = [];
  const seen = new Set<string>();
  for (const city of sorted) {
    for (const code of city.iata_codes) {
      if (seen.has(code)) continue;
      seen.add(code);
      out.push({ code, cityName: city.name });
      if (out.length >= MAX_PER_SIDE) return out;
    }
  }
  return out;
}

function zoneDisplayName(zoc: ZoneOrCity): string {
  if (zoc.kind === 'zone') return zoc.zone.display_name;
  return getZoneByIana(zoc.city.iana)?.display_name ?? zoc.city.iana;
}

export function PairAirports({ pair }: Props) {
  const fromAirports = airportsForSide(pair.from);
  const toAirports = airportsForSide(pair.to);
  if (fromAirports.length === 0 && toAirports.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-semibold">Airports in these zones</h2>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <AirportColumn
          title={`Airports in ${zoneDisplayName(pair.from)}`}
          airports={fromAirports}
        />
        <AirportColumn title={`Airports in ${zoneDisplayName(pair.to)}`} airports={toAirports} />
      </div>
    </section>
  );
}

function AirportColumn({ title, airports }: { title: string; airports: Airport[] }) {
  if (airports.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {airports.map((a) => (
          <li
            key={a.code}
            title={a.cityName}
            className="rounded-[var(--radius)] border border-[color:var(--border)] bg-card px-2.5 py-1 font-mono text-sm"
          >
            {a.code}
          </li>
        ))}
      </ul>
    </div>
  );
}

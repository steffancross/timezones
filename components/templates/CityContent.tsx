import Link from 'next/link';
import { getAllCities, getCitiesByIana, getCitiesInCountry } from '@/lib/cities/resolve';
import type { City } from '@/lib/cities/types';
import { getNextTransition } from '@/lib/time/dst';
import { getZoneByIana } from '@/lib/zones/resolve';

interface Props {
  city: City;
}

function tierRole(tier: 1 | 2 | 3): string {
  if (tier === 1) return 'a major city in';
  if (tier === 2) return 'a significant city in';
  return 'a city in';
}

export function CityContent({ city }: Props) {
  return (
    <article className="mt-12 space-y-10">
      <GeographicContext city={city} />
      {city.iata_codes.length > 0 && <Airports city={city} />}
      <ConversionLinks city={city} />
      <RelatedCities city={city} />
    </article>
  );
}

function GeographicContext({ city }: { city: City }) {
  const zone = getZoneByIana(city.iana);
  const zoneName = zone?.display_name ?? city.iana;
  const abbrevList =
    zone && zone.abbreviations.length > 0 ? ` (${zone.abbreviations.join(', ')})` : '';
  const nextTx = getNextTransition(city.iana);

  return (
    <section>
      <h2 className="text-2xl font-semibold">About {city.name}</h2>
      <p className="mt-3 text-sm leading-relaxed">
        {city.name} is {tierRole(city.tier)} {city.country}. It uses {zoneName}
        {abbrevList}.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--fg-muted)]">
        {nextTx
          ? `The next daylight saving time transition is on ${nextTx.date.toFormat(
              'MMMM d, yyyy',
            )}, when clocks ${
              nextTx.direction === 'forward' ? 'spring forward' : 'fall back'
            } from ${nextTx.abbreviationBefore} to ${nextTx.abbreviationAfter}.`
          : `${city.name} does not observe daylight saving time.`}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <FactRow
          label="Coordinates"
          value={`${city.lat.toFixed(4)}, ${city.lng.toFixed(4)}`}
          mono
        />
        <FactRow label="Population" value={city.population.toLocaleString()} mono />
        <FactRow label="Time zone" value={city.iana} />
        <FactRow label="Country" value={city.country} />
      </dl>
    </section>
  );
}

function FactRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[color:var(--fg-muted)]">{label}</dt>
      <dd className={mono ? 'font-medium tabular-nums' : 'font-medium'}>{value}</dd>
    </div>
  );
}

function Airports({ city }: { city: City }) {
  return (
    <section>
      <h2 className="text-2xl font-semibold">Airports</h2>
      <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
        Major airports serving {city.name}:
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {city.iata_codes.map((code) => (
          <li
            key={code}
            className="rounded-[var(--radius)] border border-[color:var(--border)] bg-card px-3 py-1 font-mono text-sm"
          >
            {code}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Links to pair pages from this city to popular Tier-1 destinations. Each link
 * is `/convert/{this-id}-to-{dest-id}` — these slugs are all in PR-1's
 * getCuratedPairSlugs() set (Tier-1 × Tier-1) so the pages exist.
 */
function ConversionLinks({ city }: { city: City }) {
  const destinations = getAllCities()
    .filter((c) => c.tier === 1 && c.id !== city.id)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 6);

  if (destinations.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-semibold">Convert {city.name} time to</h2>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {destinations.map((dest) => (
          <li key={dest.id}>
            <Link
              href={`/convert/${city.id}-to-${dest.id}`}
              className="block rounded-[var(--radius)] border border-[color:var(--border)] px-3 py-2 text-sm hover:bg-[var(--hover)]"
            >
              {city.name} → {dest.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RelatedCities({ city }: { city: City }) {
  const sameCountry = getCitiesInCountry(city.country_code)
    .filter((c) => c.id !== city.id)
    .sort((a, b) => b.population - a.population)
    .slice(0, 6);

  // "International cities sharing your zone" — exclude same-country, those go
  // in the sameCountry block above.
  const sameZone = getCitiesByIana(city.iana)
    .filter((c) => c.id !== city.id && c.country_code !== city.country_code)
    .sort((a, b) => b.population - a.population)
    .slice(0, 4);

  if (sameCountry.length === 0 && sameZone.length === 0) return null;

  return (
    <section>
      {sameCountry.length > 0 && (
        <>
          <h2 className="text-2xl font-semibold">Other cities in {city.country}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {sameCountry.map((c) => (
              <CityChip key={c.id} city={c} />
            ))}
          </ul>
        </>
      )}

      {sameZone.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold">Cities sharing this zone</h2>
          <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
            Other cities also using {city.iana}.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {sameZone.map((c) => (
              <CityChip key={c.id} city={c} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function CityChip({ city }: { city: City }) {
  return (
    <li>
      <Link
        href={`/time-in/${city.id}`}
        className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[color:var(--border)] px-3 py-1 text-sm hover:bg-[var(--hover)]"
      >
        <span>{city.name}</span>
        <span className="font-mono text-[10px] uppercase text-[color:var(--fg-muted)]">
          {city.country_code}
        </span>
      </Link>
    </li>
  );
}

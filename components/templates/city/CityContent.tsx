import { DateTime } from 'luxon';
import Link from 'next/link';
import { COUNTRY_INFO } from '@/lib/cities/countries';
import { getAllCities, getCitiesByIana, getCitiesInCountry } from '@/lib/cities/resolve';
import type { City } from '@/lib/cities/types';
import { getHolidays, HOLIDAYS_YEAR } from '@/lib/holidays/resolve';
import { getNextTransition } from '@/lib/time/dst';
import { resolveZoneForIana, zoneDisplayNameForIana } from '@/lib/zones/resolve';
import { AirportChip, CityChip } from '@/components/site/chips';

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
      {city.airports.length > 0 && <Airports city={city} />}
      <CityHolidays city={city} />
      <ConversionLinks city={city} />
      <RelatedCities city={city} />
    </article>
  );
}

function GeographicContext({ city }: { city: City }) {
  const zone = resolveZoneForIana(city.iana);
  const zoneName = zoneDisplayNameForIana(city.iana);
  const abbrevList =
    zone && zone.abbreviations.length > 0 ? ` (${zone.abbreviations.join(', ')})` : '';
  const nextTx = getNextTransition(city.iana);
  const countryInfo = COUNTRY_INFO[city.country_code];
  // GeoNames stores some dialing codes with a leading '+' and some without.
  const dialCode = countryInfo?.phone ? `+${countryInfo.phone.replace(/^\+/, '')}` : null;

  return (
    <section>
      <h2 className="text-2xl font-semibold">About {city.name}</h2>
      <p className="mt-3 text-sm leading-relaxed">
        {city.name} is {tierRole(city.tier)} {city.country}. It uses {zoneName}
        {abbrevList}.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--fg-muted)]">
        {nextTx ? (
          <>
            The next{' '}
            <Link
              prefetch={false}
              href="/dst"
              className="underline underline-offset-2 hover:text-[color:var(--fg)]"
            >
              daylight saving time
            </Link>{' '}
            transition is on {nextTx.date.toFormat('MMMM d, yyyy')}, when clocks{' '}
            {nextTx.direction === 'forward' ? 'spring forward' : 'fall back'} from{' '}
            {nextTx.abbreviationBefore} to {nextTx.abbreviationAfter}.
          </>
        ) : (
          <>
            {city.name} does not observe{' '}
            <Link
              prefetch={false}
              href="/dst"
              className="underline underline-offset-2 hover:text-[color:var(--fg)]"
            >
              daylight saving time
            </Link>
            .
          </>
        )}
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
        {countryInfo?.capital && <FactRow label="Capital" value={countryInfo.capital} />}
        {dialCode && <FactRow label="Calling code" value={dialCode} mono />}
      </dl>
    </section>
  );
}

/**
 * Public-holiday calendar for the city's country (current year, baked at build
 * time). Framed as a year calendar — see lib/holidays/resolve.ts. Returns null
 * when we have no holiday data for the country.
 */
function CityHolidays({ city }: { city: City }) {
  const holidays = getHolidays(city.country_code);
  if (holidays.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-semibold">
        Public holidays in {city.country} ({HOLIDAYS_YEAR})
      </h2>
      <ul className="mt-3 space-y-1 text-sm">
        {holidays.map((h) => (
          <li key={h.date} className="flex justify-between gap-4">
            <span>{h.name}</span>
            <span className="shrink-0 tabular-nums text-[color:var(--fg-muted)]">
              {DateTime.fromISO(h.date).toFormat('EEE, MMM d')}
            </span>
          </li>
        ))}
      </ul>
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
      <ul className="mt-3 flex flex-wrap gap-2">
        {city.airports.map((airport) => (
          <AirportChip key={airport.iata} iata={airport.iata} name={airport.name} />
        ))}
      </ul>
      <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
        The current local time at {city.name}'s airports (
        {city.airports.map((a) => a.iata).join(', ')}) is the same as the city time shown above.
      </p>
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
              prefetch={false}
              href={`/convert/${city.id}-to-${dest.id}`}
              className="block rounded-[var(--radius)] border border-[color:var(--border)] px-3 py-2 text-sm hover:bg-[var(--hover)]"
            >
              {city.name} → {dest.name}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-[color:var(--fg-muted)]">
        <Link
          prefetch={false}
          href="/conversions"
          className="underline underline-offset-2 hover:text-[color:var(--fg)]"
        >
          See all conversions
        </Link>
      </p>
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

      <p className="mt-3 text-sm text-[color:var(--fg-muted)]">
        <Link
          prefetch={false}
          href="/cities"
          className="underline underline-offset-2 hover:text-[color:var(--fg)]"
        >
          Browse all cities
        </Link>{' '}
        to see the current local time anywhere.
      </p>
    </section>
  );
}

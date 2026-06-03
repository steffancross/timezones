import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { HeroClock } from '@/components/site/HeroClock';
import type { City } from '@/lib/cities/types';
import { getSunTimes } from '@/lib/time/sun';
import { Moon, Sun } from 'lucide-react';
import { DateTime } from 'luxon';
import { headers } from 'next/headers';
import { CityContent } from './CityContent';
import { CitySchema } from './CitySchema';
import { CityYourTime } from './CityYourTime';

interface Props {
  city: City;
}

export async function CityShell({ city }: Props) {
  const h = await headers();
  const visitorTz = h.get('cf-timezone');
  // Suppress the "your time" line when:
  //   - no detection (local dev or non-CF deploy)
  //   - visitor is in this same zone (line would be trivial)
  //   - detected zone is UTC (almost always a fallback, not a real visitor zone)
  const showYourTime = !!visitorTz && visitorTz !== city.iana && visitorTz !== 'UTC';

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <CitySchema city={city} />

      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Cities', href: '/cities' },
          { label: city.name },
        ]}
      />

      <section className="mt-6 text-center">
        <h1 className="text-3xl font-semibold">{city.name}</h1>
        <p className="mt-1 text-[color:var(--fg-muted)]">
          {city.admin1 ? `${city.admin1}, ` : ''}
          {city.country}
        </p>

        <p className="mt-1 text-[color:var(--fg-muted)] text-sm">
          The current local time in {city.name} is
        </p>
        <div className="mt-4">
          <HeroClock iana={city.iana} />
        </div>

        <div className="mt-4">
          <AlsoKnownAs city={city} />
        </div>

        <SunsetSunriseLine city={city} />
      </section>

      {showYourTime && (
        <div className="mt-8 text-center">
          <CityYourTime cityIana={city.iana} visitorIana={visitorTz} />
        </div>
      )}

      <CityContent city={city} />
    </div>
  );
}

/**
 * Renders a subtle "Also known as:" line under the city header. Picks up
 * non-Latin-script transliterations and historical names from the dataset's
 * `alt_names` array — those are valuable for international search queries.
 *
 * Filters out the city's own name (case-insensitive) and 3-letter all-caps
 * codes (most are airport IATA codes already shown in the Airports section).
 * Capped at 4 to keep the header tidy.
 */
function AlsoKnownAs({ city }: { city: City }) {
  const lowerName = city.name.toLowerCase();
  const filtered = city.alt_names
    .filter((n) => n.toLowerCase() !== lowerName)
    .filter((n) => !/^[A-Z]{3}$/.test(n))
    .slice(0, 4);

  if (filtered.length === 0) return null;

  return (
    <p className="mt-1 text-sm text-[color:var(--fg-muted)]">
      Also known as: {filtered.join(', ')}
    </p>
  );
}

function SunsetSunriseLine({ city }: { city: City }) {
  const today = DateTime.now().setZone(city.iana).toISODate() ?? '';
  const { sunrise, sunset, dayLengthMinutes, isFallback } = getSunTimes(
    city.iana,
    today,
    city.lat,
    city.lng,
  );

  if (isFallback) return null;

  const dayHours = Math.floor(dayLengthMinutes / 60);
  const dayMin = dayLengthMinutes % 60;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-[color:var(--fg-muted)]">
      <span className="inline-flex items-center gap-1">
        <Sun className="size-3.5" aria-hidden="true" />
        Sunrise {sunrise.toFormat('h:mm a')}
      </span>
      <span className="inline-flex items-center gap-1">
        <Moon className="size-3.5" aria-hidden="true" />
        Sunset {sunset.toFormat('h:mm a')}
      </span>
      <span>
        Day length {dayHours}h {dayMin}m
      </span>
    </div>
  );
}

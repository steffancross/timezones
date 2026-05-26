import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import env from '@/lib/env';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'About',
  description: `About ${env.NEXT_PUBLIC_SITE_NAME} — what it is, where the data comes from, and how it handles daylight saving time.`,
  path: '/about',
});

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />

      <header className="mt-3 mb-6">
        <h1 className="text-3xl font-semibold">About</h1>
      </header>

      <article className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="mb-2 text-xl font-semibold">What this is</h2>
          <p className="text-muted-foreground">
            {env.NEXT_PUBLIC_SITE_NAME} is a fast, no-account time zone converter. Add the cities
            and zones you care about, scrub through the day, and see day/night and working-hour
            bands across every row at the same time.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold">How it handles DST</h2>
          <p className="text-muted-foreground">
            Time math runs through the IANA Time Zone Database, so daylight saving transitions are
            picked up automatically on the right date in each zone. There is nothing to toggle —
            offsets shift when the rules say they shift, including spring-forward and fall-back
            edges within the day you are viewing.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold">Where the data comes from</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <strong className="text-foreground">City list and coordinates:</strong>{' '}
              <a
                href="https://www.geonames.org/"
                className="underline hover:text-foreground"
                rel="noopener noreferrer"
                target="_blank"
              >
                GeoNames
              </a>
              , licensed under CC BY 4.0.
            </li>
            <li>
              <strong className="text-foreground">Time zone rules:</strong> the{' '}
              <a
                href="https://www.iana.org/time-zones"
                className="underline hover:text-foreground"
                rel="noopener noreferrer"
                target="_blank"
              >
                IANA Time Zone Database
              </a>
              .
            </li>
            <li>
              <strong className="text-foreground">Sunrise and sunset:</strong> astronomical
              calculations from the SunCalc library, with sensible fallbacks at polar latitudes
              where the sun does not rise or set on a given day.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold">Contact</h2>
          <p className="text-muted-foreground">
            Bug reports, missing or wrong data (cities, zones, DST rules), privacy questions, or
            anything else:{' '}
            <a href="support@worldtimezones.net" className="underline hover:text-foreground">
              support@worldtimezones.net
            </a>
            . Time zone data changes — countries adopt or drop DST, redraw boundaries, or rename
            zones — so corrections are always welcome.
          </p>
        </section>
      </article>
    </div>
  );
}

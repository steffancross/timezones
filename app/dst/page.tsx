import { DateTime } from 'luxon';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { DSTTable } from '@/components/site/DSTTable';
import { zones } from '@/data/zones';
import { buildMetadata } from '@/lib/seo/metadata';
import { type DSTTransition, getNextTransition } from '@/lib/time/dst';

export const dynamicParams = false;

export const metadata = buildMetadata({
  title: 'Daylight saving time around the world',
  description:
    'Upcoming DST transitions for major time zones, grouped by hemisphere. Shows the next start/end dates and offset changes.',
  path: '/dst',
});

interface TransitionRow {
  iana: string;
  displayName: string;
  region: string;
  countries: string[];
  transition: DSTTransition | null;
  observesDST: boolean;
}

const SOUTHERN_COUNTRIES = new Set(['AU', 'NZ', 'AR', 'CL', 'PY', 'UY', 'ZA', 'BR', 'BO', 'PE']);

export default function DSTPage() {
  const now = DateTime.now();

  const rows: TransitionRow[] = zones.map((z) => ({
    iana: z.iana,
    displayName: z.display_name,
    region: z.region,
    countries: z.countries,
    transition: getNextTransition(z.iana, now),
    observesDST: z.observes_dst,
  }));

  const northern = rows.filter(
    (r) => r.observesDST && !r.countries.some((c) => SOUTHERN_COUNTRIES.has(c)),
  );
  const southern = rows.filter(
    (r) => r.observesDST && r.countries.some((c) => SOUTHERN_COUNTRIES.has(c)),
  );
  const noDST = rows.filter((r) => !r.observesDST);

  const events = rows
    .filter((r): r is TransitionRow & { transition: DSTTransition } => r.transition !== null)
    .map((r) => ({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: `${r.displayName} ${r.transition.direction === 'forward' ? 'starts' : 'ends'} daylight saving time`,
      startDate: r.transition.date.toISO({ suppressMilliseconds: true }),
      endDate: r.transition.date.toISO({ suppressMilliseconds: true }),
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/MixedEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: r.displayName,
        address: r.countries[0] ?? '',
      },
      description: `Clocks ${r.transition.direction === 'forward' ? 'spring forward' : 'fall back'} from ${r.transition.abbreviationBefore} to ${r.transition.abbreviationAfter}.`,
    }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: structured-data emitted from server-trusted values
        dangerouslySetInnerHTML={{ __html: JSON.stringify(events) }}
      />

      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'DST' }]} />

      <header className="mt-3 mb-6">
        <h1 className="text-3xl font-semibold">Daylight saving time</h1>
        <p className="mt-2 text-muted-foreground">
          Upcoming time zone transitions. {northern.length + southern.length} zones observe DST;{' '}
          {noDST.length} do not.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">Northern hemisphere</h2>
        <DSTTable rows={northern} />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold">Southern hemisphere</h2>
        <DSTTable rows={southern} />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Does not observe DST</h2>
        <ul className="grid gap-1 text-sm sm:grid-cols-2 md:grid-cols-3">
          {noDST.map((r) => (
            <li key={r.iana} className="text-muted-foreground">
              {r.displayName}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

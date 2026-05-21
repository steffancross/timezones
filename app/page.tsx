import { headers } from 'next/headers';
import { Converter } from '@/components/converter/Converter';
import { ConverterStateProvider } from '@/components/converter/ConverterStateProvider';
import { getZoneByIana } from '@/data/zones';
import { buildMetadata } from '@/lib/seo/metadata';
import type { ZoneRef } from '@/lib/store/converter';
import { pickContextualZones } from '@/lib/zones/contextual';

// Force per-request render so the cf-timezone / cf-ipcountry headers actually
// vary the response. SSG would cache one variant for all visitors.
export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Time Zone Converter',
  description:
    'Compare time across cities and zones. Day/night and working-hour overlays, sharable permanent links.',
  path: '/',
});

export default async function HomePage() {
  const h = await headers();
  const detectedTz = h.get('cf-timezone');
  const country = h.get('cf-ipcountry');

  const ianas = pickContextualZones(detectedTz, country);

  const zones: ZoneRef[] = ianas.map((iana) => {
    const z = getZoneByIana(iana);
    return z
      ? { kind: 'zone', slug: z.id, iana: z.iana }
      : { kind: 'zone', slug: iana.toLowerCase().replace(/\//g, '-'), iana };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Time Zone Converter</h1>
        <p className="mt-2 text-[color:var(--fg-muted)]">Compare time across cities and zones.</p>
      </header>

      <ConverterStateProvider initialState={{ zones, homeZoneIndex: 0 }}>
        <Converter />
      </ConverterStateProvider>

      <article className="mt-12 grid gap-10 md:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold">About</h2>
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--fg-muted)]">
            A quick way to compare time across cities and zones. Add the rows you care about and
            see day-and-night and working-hour bands at a glance.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--fg-muted)]">
            DST transitions are handled automatically; offsets shift on the right date in each zone
            without you doing anything.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Getting started</h2>
          <ol className="mt-3 space-y-2 text-sm leading-relaxed text-[color:var(--fg-muted)]">
            <li>
              <span className="font-medium text-[color:var(--fg)]">1.</span> Search for a city or
              zone in the toolbar and add it.
            </li>
            <li>
              <span className="font-medium text-[color:var(--fg)]">2.</span> Hover any hour to
              highlight that moment across every row.
            </li>
            <li>
              <span className="font-medium text-[color:var(--fg)]">3.</span> Use the date picker to
              plan meetings on a specific day.
            </li>
            <li>
              <span className="font-medium text-[color:var(--fg)]">4.</span> Open Settings to
              highlight working hours and weekends across every row.
            </li>
          </ol>
        </section>
      </article>
    </div>
  );
}

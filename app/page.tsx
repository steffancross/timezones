import { headers } from 'next/headers';
import { Converter } from '@/components/converter/Converter';
import { ConverterStateProvider } from '@/components/converter/ConverterStateProvider';
import { PairLinks } from '@/components/converter/PairLinks';
import { WebsiteSchema } from '@/components/site/WebsiteSchema';
import { getZoneByIana } from '@/data/zones';
import { buildMetadata } from '@/lib/seo/metadata';
import type { ZoneRef } from '@/lib/store/converter';
import { parseSearchParams, urlToState } from '@/lib/store/from-url';
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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [h, sp] = await Promise.all([headers(), searchParams]);
  const detectedTz = h.get('cf-timezone');
  const country = h.get('cf-ipcountry');

  // Shared links carry `?z=<slug>,<slug>` — when present and at least one slug
  // resolves, those zones win over the cf-header contextual picks. The rest of
  // the URL state (range, date, format) is hydrated via urlToState so a pasted
  // share link restores the full view, not just the zones.
  const parsed = parseSearchParams(sp);
  const contextualZones: ZoneRef[] = pickContextualZones(detectedTz, country).map((iana) => {
    const z = getZoneByIana(iana);
    return z
      ? { kind: 'zone', slug: z.id, iana: z.iana }
      : { kind: 'zone', slug: iana.toLowerCase().replace(/\//g, '-'), iana };
  });
  const initialState = {
    ...urlToState(parsed),
    // urlToState only sets zones when the URL provided them; on the homepage
    // we fall back to the cf-header contextual picks so first-time visitors
    // land on a useful default rather than an empty card.
    zones: parsed.zones && parsed.zones.length > 0 ? parsed.zones : contextualZones,
    homeZoneIndex: 0,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <WebsiteSchema />
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Time Zone Converter</h1>
        <p className="mt-2 text-[color:var(--fg-muted)]">Compare time across cities and zones.</p>
      </header>

      <ConverterStateProvider initialState={initialState}>
        <Converter visitorIana={detectedTz ?? undefined} />

        <article className="mt-12 grid gap-10 md:grid-cols-2">
          <PairLinks />

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
                <span className="font-medium text-[color:var(--fg)]">3.</span> Use the date picker
                to plan meetings on a specific day.
              </li>
              <li>
                <span className="font-medium text-[color:var(--fg)]">4.</span> Open Settings to
                highlight working hours and weekends across every row.
              </li>
            </ol>
          </section>
        </article>
      </ConverterStateProvider>
    </div>
  );
}

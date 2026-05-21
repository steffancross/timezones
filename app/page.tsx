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
    </div>
  );
}

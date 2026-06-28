import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { getAllZones } from '@/data/zones';
import { buildMetadata } from '@/lib/seo/metadata';
import { formatUtcOffset } from '@/lib/zones/offset';
import type { Zone } from '@/lib/zones/types';
import Link from 'next/link';

export const metadata = buildMetadata({
  title: 'Time zones',
  description:
    "Browse 49 of the world's time zones — UTC offsets, abbreviations, daylight saving rules, and the current time in each.",
  path: '/timezones',
});

// Display order for the region sections (Zone.region is the grouping key).
const REGION_ORDER: Zone['region'][] = [
  'Global',
  'North America',
  'Europe',
  'Middle East',
  'Asia',
  'Oceania',
  'South America',
  'Africa',
];

export default function TimezonesIndex() {
  const zones = getAllZones();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Timezones' }]} />

      <header className="mt-3 mb-8">
        <h1 className="text-3xl font-semibold">Time zones</h1>
        <p className="mt-2 text-muted-foreground">
          {zones.length} world time zones — current time, UTC offset, and daylight saving rules.
        </p>
      </header>

      {REGION_ORDER.map((region) => {
        const list = zones
          .filter((z) => z.region === region)
          .sort((a, b) => b.popularity - a.popularity);
        if (list.length === 0) return null;

        return (
          <section key={region} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">{region}</h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((z) => (
                <li key={z.id}>
                  <Link
                    prefetch={false}
                    href={`/timezone/${z.id}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent"
                  >
                    <span>
                      {z.display_name}
                      <span className="ml-2 font-mono text-[10px] uppercase text-muted-foreground">
                        {z.abbreviations[0]}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {formatUtcOffset(z.utc_offset_std)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

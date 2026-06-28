import Link from 'next/link';
import { getAllZones } from '@/data/zones';
import { formatUtcOffset } from '@/lib/zones/offset';
import type { Zone } from '@/lib/zones/types';

/** Curated count of destination zones to show; the rest live on /conversions. */
const MAX_DESTINATIONS = 12;

/**
 * "Convert {zone} to…" launchpad — the internal-linking payload of the page.
 * Links to the top destination zones by popularity. Every Zone×Zone pair slug
 * is in `getCuratedPairSlugs()`, so each `/convert/{from}-to-{to}` target is a
 * prerendered page.
 */
export function ConvertFromZone({ zone }: { zone: Zone }) {
  const destinations = getAllZones()
    .filter((z) => z.id !== zone.id)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, MAX_DESTINATIONS);

  return (
    <section>
      <h2 className="text-2xl font-semibold">Convert {zone.display_name} to</h2>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {destinations.map((dest) => (
          <li key={dest.id}>
            <Link
              prefetch={false}
              href={`/convert/${zone.id}-to-${dest.id}`}
              className="flex items-center justify-between gap-2 rounded-[var(--radius)] border border-border bg-card px-3 py-2 text-sm hover:bg-[var(--hover)]"
            >
              <span>{dest.display_name}</span>
              <span className="shrink-0 font-mono text-[10px] text-[color:var(--fg-muted)]">
                {formatUtcOffset(dest.utc_offset_std)}
              </span>
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

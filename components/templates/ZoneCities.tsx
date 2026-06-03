import Link from 'next/link';
import { getCitiesForZone } from '@/lib/zones/resolve';
import type { Zone } from '@/lib/zones/types';
import { CityChip } from './chips';

/** How many cities to surface as chips before pointing at the full directory. */
const MAX_CITIES = 30;

/**
 * Major cities in this zone, most-populous first. Uses `getCitiesForZone`, which
 * spans every IANA that maps to the curated zone — so Vancouver and Tijuana show
 * up under Pacific Time, not just Los Angeles. All member IANAs share the zone's
 * offset rules by construction, so the "matches this zone" claim holds.
 */
export function ZoneCities({ zone }: { zone: Zone }) {
  const all = getCitiesForZone(zone.id);
  const cities = all.slice(0, MAX_CITIES);
  if (cities.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-semibold">Major cities in {zone.display_name}</h2>
      <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
        The current local time in these cities matches {zone.display_name}.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {cities.map((c) => (
          <CityChip key={c.id} city={c} />
        ))}
      </ul>
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

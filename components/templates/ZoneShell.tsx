import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { HeroClock } from '@/components/site/HeroClock';
import { formatUtcOffset } from '@/lib/zones/offset';
import type { Zone } from '@/lib/zones/types';
import { ZoneContent } from './ZoneContent';

/**
 * Top-level wrapper for a `/timezone/[id]` page. Static by design — no
 * `cf-timezone` read, so the route stays cleanly SSG (unlike CityShell, which
 * reads headers for its "your time" line). Hero is the identity + a live clock;
 * everything else is in ZoneContent.
 */
export function ZoneShell({ zone }: { zone: Zone }) {
  const offsetLabel =
    zone.utc_offset_dst != null
      ? `${formatUtcOffset(zone.utc_offset_std)} / ${formatUtcOffset(zone.utc_offset_dst)} (DST)`
      : formatUtcOffset(zone.utc_offset_std);
  const showLongName = zone.display_name_long !== zone.display_name;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Timezones', href: '/timezones' },
          { label: zone.display_name },
        ]}
      />

      <section className="mt-6 text-center">
        <h1 className="text-3xl font-semibold">{zone.display_name}</h1>
        {showLongName && (
          <p className="mt-1 text-[color:var(--fg-muted)]">{zone.display_name_long}</p>
        )}
        <p className="mt-1 text-sm text-[color:var(--fg-muted)]">
          {zone.abbreviations.join(' / ')} · {offsetLabel}
        </p>

        <div className="mt-4">
          <HeroClock iana={zone.iana} />
        </div>
      </section>

      <ZoneContent zone={zone} />
    </div>
  );
}

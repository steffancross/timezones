import { DateTime } from 'luxon';
import { getSunTimes } from '@/lib/time/sun';
import type { Zone } from '@/lib/zones/types';

/**
 * Sunrise/sunset/day-length for the zone's representative location today. The
 * one-sided version of the pair page's PairDaylight. Skipped for UTC (a
 * reference offset with no real ground location) and for polar fallbacks.
 */
export function ZoneDaylight({ zone }: { zone: Zone }) {
  if (zone.iana === 'UTC') return null;

  const today = DateTime.now().setZone(zone.iana).toISODate() ?? '';
  const sun = getSunTimes(zone.iana, today, zone.lat, zone.lng);
  if (sun.isFallback) return null;

  return (
    <section>
      <h2 className="text-2xl font-semibold">Daylight today</h2>
      <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
        Sun times at the representative location for {zone.display_name}.
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm tabular-nums">
        <div>
          <dt className="text-xs text-[color:var(--fg-muted)]">Sunrise</dt>
          <dd>{sun.sunrise.toFormat('h:mm a')}</dd>
        </div>
        <div>
          <dt className="text-xs text-[color:var(--fg-muted)]">Sunset</dt>
          <dd>{sun.sunset.toFormat('h:mm a')}</dd>
        </div>
        <div>
          <dt className="text-xs text-[color:var(--fg-muted)]">Day length</dt>
          <dd>{formatDuration(sun.dayLengthMinutes)}</dd>
        </div>
      </dl>
    </section>
  );
}

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

import { DateTime } from 'luxon';
import type { ParsedPair, ZoneOrCity } from '@/lib/slugs/parse';
import { getSunTimes } from '@/lib/time/sun';

interface Props {
  pair: ParsedPair;
}

interface SideSun {
  iana: string;
  name: string;
  sunrise: DateTime;
  sunset: DateTime;
  dayLengthMinutes: number;
  isFallback: boolean;
}

function displayName(zoc: ZoneOrCity): string {
  return zoc.kind === 'zone' ? zoc.zone.display_name : zoc.city.name;
}

function coords(zoc: ZoneOrCity): { lat: number; lng: number } {
  if (zoc.kind === 'zone') return { lat: zoc.zone.lat, lng: zoc.zone.lng };
  return { lat: zoc.city.lat, lng: zoc.city.lng };
}

function sideSun(zoc: ZoneOrCity): SideSun {
  const iana = zoc.kind === 'zone' ? zoc.zone.iana : zoc.city.iana;
  const { lat, lng } = coords(zoc);
  // "Today" is per-side: each zone has its own current local date. Near a
  // date boundary the two sides may compute on different ISO dates, which is
  // intentional — we want "today in this zone" semantics.
  const today = DateTime.now().setZone(iana).toISODate() ?? '';
  const sun = getSunTimes(iana, today, lat, lng);
  return {
    iana,
    name: displayName(zoc),
    sunrise: sun.sunrise,
    sunset: sun.sunset,
    dayLengthMinutes: sun.dayLengthMinutes,
    isFallback: sun.isFallback,
  };
}

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatLocalTime(dt: DateTime): string {
  return dt.toFormat('h:mm a');
}

/**
 * Compute UTC overlap of daylight intervals between two sides, expressed in
 * each side's local time. Returns null if there's no overlap (rare — would
 * require both at near-polar lats on opposite sides at solstice).
 */
function computeOverlap(from: SideSun, to: SideSun) {
  const overlapStartUTC = Math.max(from.sunrise.toMillis(), to.sunrise.toMillis());
  const overlapEndUTC = Math.min(from.sunset.toMillis(), to.sunset.toMillis());
  if (overlapEndUTC <= overlapStartUTC) return null;

  const durationMinutes = Math.round((overlapEndUTC - overlapStartUTC) / 60_000);
  const fromStart = DateTime.fromMillis(overlapStartUTC, { zone: from.iana });
  const fromEnd = DateTime.fromMillis(overlapEndUTC, { zone: from.iana });
  const toStart = DateTime.fromMillis(overlapStartUTC, { zone: to.iana });
  const toEnd = DateTime.fromMillis(overlapEndUTC, { zone: to.iana });

  return {
    durationMinutes,
    fromRange: `${formatLocalTime(fromStart)}–${formatLocalTime(fromEnd)}`,
    toRange: `${formatLocalTime(toStart)}–${formatLocalTime(toEnd)}`,
  };
}

export function PairDaylight({ pair }: Props) {
  const from = sideSun(pair.from);
  const to = sideSun(pair.to);

  // If either side is polar (fallback), `getSunTimes` returns sentinel values
  // that don't reflect real sunrise/sunset. Skip the section entirely — better
  // to omit than display misleading data.
  if (from.isFallback || to.isFallback) return null;

  const overlap = computeOverlap(from, to);

  return (
    <section>
      <h2 className="text-2xl font-semibold">Daylight today</h2>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <SideCard sun={from} />
        <SideCard sun={to} />
      </div>
      {overlap && (
        <p className="mt-4 text-sm text-[color:var(--fg-muted)]">
          <strong className="text-[color:var(--fg)]">Daylight overlap:</strong>{' '}
          {formatDuration(overlap.durationMinutes)} — {overlap.fromRange} in {from.name} (
          {overlap.toRange} in {to.name}). Both locations are in daylight during this window.
        </p>
      )}
    </section>
  );
}

function SideCard({ sun }: { sun: SideSun }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-4">
      <div className="text-sm font-semibold">{sun.name}</div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm tabular-nums">
        <div>
          <dt className="text-xs text-[color:var(--fg-muted)]">Sunrise</dt>
          <dd>{formatLocalTime(sun.sunrise)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[color:var(--fg-muted)]">Sunset</dt>
          <dd>{formatLocalTime(sun.sunset)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[color:var(--fg-muted)]">Day length</dt>
          <dd>{formatDuration(sun.dayLengthMinutes)}</dd>
        </div>
      </dl>
    </div>
  );
}

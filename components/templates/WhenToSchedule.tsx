import { DateTime } from 'luxon';
import type { ParsedPair, ZoneOrCity } from '@/lib/slugs/parse';
import { formatTime } from '@/lib/time/format';
import { DEFAULT_WORKING_HOURS } from '@/lib/time/working-hours';

interface Props {
  pair: ParsedPair;
}

function displayName(zoc: ZoneOrCity): string {
  return zoc.kind === 'zone' ? zoc.zone.display_name : zoc.city.name;
}

/**
 * Compute the overlap window where 9-5 in both zones coincides on the same
 * calendar day. Expressed as a list of "from"-zone hours.
 */
function computeOverlap(pair: ParsedPair) {
  const date = DateTime.now().setZone(pair.fromIana).startOf('day');
  const wh = DEFAULT_WORKING_HOURS;

  const fromHours: number[] = [];
  for (let hour = wh.start; hour < wh.end; hour++) {
    const fromLocal = date.set({ hour });
    const toLocal = fromLocal.setZone(pair.toIana);
    const inWorkingDay = wh.days.includes(toLocal.weekday);
    const inWorkingHour = toLocal.hour >= wh.start && toLocal.hour < wh.end;
    if (inWorkingDay && inWorkingHour) fromHours.push(hour);
  }
  return fromHours;
}

function formatHourRange(startHour: number, endHourExclusive: number): string {
  const fmt = (h: number) => {
    if (h === 0 || h === 24) return '12 AM';
    if (h === 12) return '12 PM';
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
  };
  return `${fmt(startHour)}–${fmt(endHourExclusive)}`;
}

export function WhenToSchedule({ pair }: Props) {
  const fromName = displayName(pair.from);
  const toName = displayName(pair.to);
  const overlap = computeOverlap(pair);

  return (
    <section>
      <h2 className="text-2xl font-semibold">When to schedule</h2>

      {overlap.length === 0 ? (
        <p className="mt-3 text-sm text-[color:var(--fg-muted)]">
          Standard business hours (9 AM–5 PM) in {fromName} and {toName} don't overlap on the same
          calendar day. Plan early-morning or evening meetings, or coordinate around one team's
          off-hours.
        </p>
      ) : (
        <OverlapDetail pair={pair} fromHours={overlap} fromName={fromName} toName={toName} />
      )}
    </section>
  );
}

function OverlapDetail({
  pair,
  fromHours,
  fromName,
  toName,
}: {
  pair: ParsedPair;
  fromHours: number[];
  fromName: string;
  toName: string;
}) {
  const [first] = fromHours;
  const last = fromHours[fromHours.length - 1];
  if (first === undefined || last === undefined) return null;

  const date = DateTime.now().setZone(pair.fromIana).startOf('day');
  const toFirst = date.set({ hour: first }).setZone(pair.toIana).hour;
  const toLast = date.set({ hour: last }).setZone(pair.toIana).hour;

  // Suggested time: middle of the overlap, expressed in both zones.
  const mid = fromHours[Math.floor(fromHours.length / 2)];
  if (mid === undefined) return null;
  const fromMid = date.set({ hour: mid, minute: 0 });
  const toMid = fromMid.setZone(pair.toIana);

  return (
    <div className="mt-3 space-y-3 text-sm">
      <p>
        <strong>Business-hours overlap:</strong> {formatHourRange(first, last + 1)} in {fromName} (
        {formatHourRange(toFirst, toLast + 1)} in {toName}).
      </p>
      <p className="text-[color:var(--fg-muted)]">
        Both teams are in working hours during this window on weekdays.
      </p>
      <p>
        <strong>Suggested time:</strong> {formatTime(fromMid, '12')} {fromName} (
        {formatTime(toMid, '12')} {toName}).
      </p>
    </div>
  );
}

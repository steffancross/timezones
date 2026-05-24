import { DateTime } from 'luxon';
import type { ParsedPair, ZoneOrCity } from '@/lib/slugs/parse';
import { zoneObservesDst } from '@/lib/time/luxon';
import {
  type BusinessOverlapWindow,
  computeBusinessOverlap,
  DEFAULT_WORKING_HOURS,
} from '@/lib/time/working-hours';

interface Props {
  pair: ParsedPair;
}

function displayName(zoc: ZoneOrCity): string {
  return zoc.kind === 'zone' ? zoc.zone.display_name : zoc.city.name;
}

function formatHourRange(startHour: number, endHourExclusive: number): string {
  const fmt = (h: number) => {
    if (h === 0 || h === 24) return '12 AM';
    if (h === 12) return '12 PM';
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
  };
  return `${fmt(startHour)}–${fmt(endHourExclusive)}`;
}

function dayDeltaLabel(delta: -1 | 0 | 1): string {
  if (delta === 1) return ' the next day';
  if (delta === -1) return ' the previous day';
  return '';
}

/**
 * Approximate hours-difference between two zones using each zone's offset
 * "right now". Used only for an informational sentence in the empty-overlap
 * case — not for math. Sign convention: positive = `to` is ahead of `from`.
 */
function hoursAhead(fromIana: string, toIana: string): number {
  const now = DateTime.now();
  const fromOffset = now.setZone(fromIana).offset;
  const toOffset = now.setZone(toIana).offset;
  return Math.round((toOffset - fromOffset) / 60);
}

export function WhenToSchedule({ pair }: Props) {
  const fromName = displayName(pair.from);
  const toName = displayName(pair.to);
  const windows = computeBusinessOverlap(pair.fromIana, pair.toIana, DEFAULT_WORKING_HOURS);
  const eitherObservesDst =
    zoneObservesDst(pair.fromIana) || zoneObservesDst(pair.toIana);

  return (
    <section>
      <h2 className="text-2xl font-semibold">When to schedule</h2>

      {windows.length === 0 ? (
        <NoOverlap pair={pair} fromName={fromName} toName={toName} />
      ) : (
        <OverlapDetail
          windows={windows}
          fromName={fromName}
          toName={toName}
          fromIana={pair.fromIana}
          toIana={pair.toIana}
        />
      )}

      {eitherObservesDst && (
        <p className="mt-3 text-xs text-[color:var(--fg-subtle)]">
          This window may shift by an hour during daylight saving time.
        </p>
      )}
    </section>
  );
}

function OverlapDetail({
  windows,
  fromName,
  toName,
  fromIana,
  toIana,
}: {
  windows: BusinessOverlapWindow[];
  fromName: string;
  toName: string;
  fromIana: string;
  toIana: string;
}) {
  const primary = windows[0];
  if (!primary) return null;

  const fromRange = formatHourRange(primary.fromStartHour, primary.fromEndHour);
  const toRange = formatHourRange(primary.toStartHour, primary.toEndHour);
  const toDayNote = dayDeltaLabel(primary.toDayDelta);

  // Suggested meeting: middle of the window, expressed in both zones.
  const midFromHour =
    primary.fromStartHour + Math.floor((primary.fromEndHour - primary.fromStartHour) / 2);
  const monday = DateTime.now().setZone(fromIana).startOf('week');
  const midFrom = monday.set({ hour: midFromHour });
  const midTo = midFrom.setZone(toIana);

  return (
    <div className="mt-3 space-y-3 text-sm">
      <p>
        <strong>Business-hours overlap:</strong> {fromRange} in {fromName} ({toRange}
        {toDayNote} in {toName}).
      </p>
      <p className="text-[color:var(--fg-muted)]">
        Both teams are in working hours during this window on weekdays.
      </p>
      <p>
        <strong>Suggested time:</strong> {midFrom.toFormat('h:mm a')} {fromName} (
        {midTo.toFormat('h:mm a')} {toName}).
      </p>
    </div>
  );
}

function NoOverlap({
  pair,
  fromName,
  toName,
}: {
  pair: ParsedPair;
  fromName: string;
  toName: string;
}) {
  const delta = hoursAhead(pair.fromIana, pair.toIana);
  const absDelta = Math.abs(delta);
  const direction = delta > 0 ? 'ahead of' : 'behind';

  return (
    <div className="mt-3 space-y-3 text-sm">
      <p>
        Standard business hours (9 AM–5 PM, Mon–Fri) in {fromName} and {toName} don't overlap on the
        same weekday. {toName} is {absDelta} hour{absDelta === 1 ? '' : 's'} {direction} {fromName}.
      </p>
      <p className="text-[color:var(--fg-muted)]">
        Realistic options: hand off asynchronously, or stretch one side by an hour to catch the
        other team at the start or end of their day.
      </p>
    </div>
  );
}

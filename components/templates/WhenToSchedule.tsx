import { DateTime } from 'luxon';
import type { ParsedPair, ZoneOrCity } from '@/lib/slugs/parse';
import { zoneObservesDst } from '@/lib/time/luxon';
import {
  type BusinessOverlapWindow,
  computeBusinessOverlap,
  DEFAULT_WORKING_HOURS,
  EXTENDED_WORKING_HOURS,
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

/**
 * Pick a concrete suggested meeting time at the middle of an overlap window,
 * expressed in both zones. Anchored on this week's Monday in `from` (matching
 * computeBusinessOverlap) so the time is a real weekday instant, not "now".
 */
function suggestedTime(window: BusinessOverlapWindow, fromIana: string, toIana: string) {
  const midFromHour =
    window.fromStartHour + Math.floor((window.fromEndHour - window.fromStartHour) / 2);
  const monday = DateTime.now().setZone(fromIana).startOf('week');
  const midFrom = monday.set({ hour: midFromHour });
  return { midFrom, midTo: midFrom.setZone(toIana) };
}

export function WhenToSchedule({ pair }: Props) {
  const fromName = displayName(pair.from);
  const toName = displayName(pair.to);
  const windows = computeBusinessOverlap(pair.fromIana, pair.toIana, DEFAULT_WORKING_HOURS);
  const eitherObservesDst = zoneObservesDst(pair.fromIana) || zoneObservesDst(pair.toIana);

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

  const { midFrom, midTo } = suggestedTime(primary, fromIana, toIana);

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

  // Standard 9–5 misses, but an early-start / late-finish slot may still line
  // up. Because the strict window already returned empty, any window found here
  // necessarily falls in the 7–9am / 5–8pm fringe — never plain business hours.
  // Near-antipodal offsets (~11–13h) yield two windows: each side's morning
  // catches the other's evening, on both sides of the clock.
  const extended = computeBusinessOverlap(pair.fromIana, pair.toIana, EXTENDED_WORKING_HOURS);

  return (
    <div className="mt-3 space-y-3 text-sm">
      <p>
        Standard business hours (9 AM–5 PM, Mon–Fri) in {fromName} and {toName} don't overlap on the
        same weekday. {toName} is {absDelta} hour{absDelta === 1 ? '' : 's'} {direction} {fromName}.
      </p>

      {extended.length > 0 ? (
        <ExtendedSuggestion
          windows={extended}
          fromName={fromName}
          toName={toName}
          fromIana={pair.fromIana}
          toIana={pair.toIana}
        />
      ) : (
        <p className="text-[color:var(--fg-muted)]">
          Realistic options: hand off asynchronously, or stretch one side by an hour to catch the
          other team at the start or end of their day.
        </p>
      )}
    </div>
  );
}

/**
 * Shown when 9–5 doesn't overlap but a wider 7am–8pm window does. Frames the
 * slot honestly as outside standard hours — an early start or late finish for
 * one side — while still giving a concrete time to propose. Near-antipodal
 * pairs surface two windows (early-AM and late-PM options); the geometry of
 * two 14h windows on a 24h clock caps the count at two.
 */
function ExtendedSuggestion({
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
  const multiple = windows.length > 1;

  return (
    <>
      <p>
        <strong>With some flexibility,</strong>{' '}
        {multiple
          ? 'there are two workable windows outside standard hours, depending on which side takes the early or late slot:'
          : 'there’s a workable window outside standard hours:'}
      </p>
      <ul className={multiple ? 'list-disc space-y-2 pl-5' : 'space-y-2'}>
        {windows.map((window) => {
          const fromRange = formatHourRange(window.fromStartHour, window.fromEndHour);
          const toRange = formatHourRange(window.toStartHour, window.toEndHour);
          const toDayNote = dayDeltaLabel(window.toDayDelta);
          const { midFrom, midTo } = suggestedTime(window, fromIana, toIana);
          return (
            <li key={window.fromStartHour}>
              {fromRange} in {fromName} ({toRange}
              {toDayNote} in {toName}) — suggest {midFrom.toFormat('h:mm a')} {fromName} (
              {midTo.toFormat('h:mm a')} {toName}).
            </li>
          );
        })}
      </ul>
      <p className="text-[color:var(--fg-muted)]">
        {multiple
          ? 'Either is an early start or late finish for one side, but workable for a one-off meeting.'
          : 'This means an early start or late finish for one side, but it’s a reasonable slot for a one-off meeting.'}
      </p>
    </>
  );
}

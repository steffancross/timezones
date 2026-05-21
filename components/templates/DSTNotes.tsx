import type { DateTime } from 'luxon';
import type { ParsedPair, ZoneOrCity } from '@/lib/slugs/parse';
import { getNextTransition } from '@/lib/time/dst';

interface Props {
  pair: ParsedPair;
}

function displayName(zoc: ZoneOrCity): string {
  return zoc.kind === 'zone' ? zoc.zone.display_name : zoc.city.name;
}

type Transition = NonNullable<ReturnType<typeof getNextTransition>>;

export function DSTNotes({ pair }: Props) {
  const fromName = displayName(pair.from);
  const toName = displayName(pair.to);

  const fromNext = getNextTransition(pair.fromIana);
  const toNext = getNextTransition(pair.toIana);

  return (
    <section>
      <h2 className="text-2xl font-semibold">Daylight saving time</h2>
      <div className="mt-3 space-y-3 text-sm">
        {renderDSTBehavior(fromName, toName, fromNext, toNext)}
      </div>
    </section>
  );
}

function renderDSTBehavior(
  fromName: string,
  toName: string,
  fromNext: Transition | null,
  toNext: Transition | null,
) {
  // Case 1: neither observes DST → offset is constant year-round.
  if (!fromNext && !toNext) {
    return (
      <p>
        Neither {fromName} nor {toName} observes daylight saving time. The offset between these
        zones remains constant year-round.
      </p>
    );
  }

  // Case 2: only `from` observes DST.
  if (fromNext && !toNext) {
    return (
      <p>
        {fromName} observes daylight saving time; {toName} does not. The offset between the two
        zones changes when {fromName} transitions: on {formatTransitionDate(fromNext.date)}, clocks{' '}
        {fromNext.direction === 'forward' ? 'spring forward' : 'fall back'} from{' '}
        {fromNext.abbreviationBefore} to {fromNext.abbreviationAfter}.
      </p>
    );
  }

  // Case 3: only `to` observes DST.
  if (toNext && !fromNext) {
    return (
      <p>
        {toName} observes daylight saving time; {fromName} does not. The offset between the two
        zones changes when {toName} transitions: on {formatTransitionDate(toNext.date)}, clocks{' '}
        {toNext.direction === 'forward' ? 'spring forward' : 'fall back'} from{' '}
        {toNext.abbreviationBefore} to {toNext.abbreviationAfter}.
      </p>
    );
  }

  // Case 4: both observe DST.
  if (fromNext && toNext) {
    const sameDate = fromNext.date.hasSame(toNext.date, 'day');
    if (sameDate) {
      return (
        <>
          <p>
            Both {fromName} and {toName} observe daylight saving time and transition on the same
            date.
          </p>
          <p>
            Next transition: {formatTransitionDate(fromNext.date)} (
            {fromNext.direction === 'forward' ? 'spring forward' : 'fall back'}).
          </p>
          <p>
            Because they transition simultaneously, the offset between these zones remains constant
            year-round.
          </p>
        </>
      );
    }
    return (
      <>
        <p>Both zones observe daylight saving time, but they transition on different dates.</p>
        <p>
          {fromName}: next transition on {formatTransitionDate(fromNext.date)}.
        </p>
        <p>
          {toName}: next transition on {formatTransitionDate(toNext.date)}.
        </p>
        <p className="text-[color:var(--fg-muted)]">
          For approximately {gapDays(fromNext.date, toNext.date)} days between transitions, the
          offset between {fromName} and {toName} differs from its typical value. Recurring meetings
          during this window will shift by one hour.
        </p>
      </>
    );
  }

  return null;
}

function formatTransitionDate(dt: DateTime): string {
  return dt.toFormat('EEEE, MMMM d, yyyy');
}

function gapDays(a: DateTime, b: DateTime): number {
  return Math.abs(Math.round(a.diff(b, 'days').days));
}

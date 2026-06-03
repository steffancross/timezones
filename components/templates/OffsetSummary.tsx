import type { ParsedPair, ZoneOrCity } from '@/lib/slugs/parse';
import { formatOffset } from '@/lib/time/format';
import { currentAbbreviation } from '@/lib/zones/abbreviation';
import { DateTime } from 'luxon';

interface Props {
  pair: ParsedPair;
}

function displayName(zoc: ZoneOrCity): string {
  return zoc.kind === 'zone' ? zoc.zone.display_name : zoc.city.name;
}

function abbrev(zoc: ZoneOrCity, at: DateTime): string {
  // DST-aware colloquial abbreviation from our curated table (BST/NZDT in
  // summer), not the runtime's "GMT±N" short name. Unify on IANA so zone and
  // city refs resolve identically.
  const iana = zoc.kind === 'zone' ? zoc.zone.iana : zoc.city.iana;
  return currentAbbreviation(iana, at);
}

export function OffsetSummary({ pair }: Props) {
  // Build-time/SSR snapshot. Offset accuracy degrades only at DST transitions
  // (twice a year per zone) — acceptable for the body reference content; the
  // live converter above this is real-time.
  const now = DateTime.now();
  const fromTime = now.setZone(pair.fromIana);
  const toTime = now.setZone(pair.toIana);

  const offsetDiffHours = (fromTime.offset - toTime.offset) / 60;
  const absHours = Math.abs(offsetDiffHours);
  const direction = offsetDiffHours > 0 ? 'ahead of' : 'behind';

  const fromName = displayName(pair.from);
  const toName = displayName(pair.to);
  const fromAbbrev = abbrev(pair.from, now);
  const toAbbrev = abbrev(pair.to, now);

  return (
    <section>
      <h2 className="text-2xl font-semibold">Offset</h2>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--fg-muted)]">
        {absHours === 0 ? (
          <>There is no time difference between {fromName} and {toName}.</>
        ) : (
          <>
            The time difference between {fromName} and {toName} is {absHours}{' '}
            {absHours === 1 ? 'hour' : 'hours'}.
          </>
        )}
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-[color:var(--border)] p-5">
          <div className="text-4xl font-light tabular-nums">
            {absHours === 0 ? (
              'Same time'
            ) : (
              <>
                {absHours} {absHours === 1 ? 'hour' : 'hours'}
              </>
            )}
          </div>
          <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
            {fromName} ({fromAbbrev}){' '}
            {absHours === 0 ? (
              <>
                is currently the same time as {toName} ({toAbbrev})
              </>
            ) : (
              <>
                is {direction} {toName} ({toAbbrev})
              </>
            )}
            .
          </p>
        </div>

        <div className="rounded-[var(--radius)] border border-[color:var(--border)] p-5 text-sm">
          <p>
            <strong>{fromAbbrev}</strong>: {formatOffset(fromTime.offset)}
          </p>
          <p className="mt-2">
            <strong>{toAbbrev}</strong>: {formatOffset(toTime.offset)}
          </p>
          <p className="mt-3 text-[color:var(--fg-muted)]">
            {dstSummary(fromName, toName, fromTime, toTime)}
          </p>
        </div>
      </div>
    </section>
  );
}

function dstSummary(
  fromName: string,
  toName: string,
  fromTime: DateTime,
  toTime: DateTime,
): string {
  const fromDST = fromTime.isInDST;
  const toDST = toTime.isInDST;

  if (fromDST && toDST) return 'Both zones are currently observing daylight saving time.';
  if (!fromDST && !toDST) {
    return `Neither ${fromName} nor ${toName} is currently observing daylight saving time.`;
  }
  return `${fromDST ? fromName : toName} is currently observing daylight saving time; ${
    fromDST ? toName : fromName
  } is not.`;
}

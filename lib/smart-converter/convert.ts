import { currentAbbreviation } from '@/lib/zones/abbreviation';
import { formatUtcOffset } from '@/lib/zones/offset';
import { type TimeFormat, formatClock } from '@/lib/time/format';
import { DateTime, FixedOffsetZone, type Zone as LuxonZone } from 'luxon';
import type { ConvertedEvent, EventTime, ResolvedEvent, ZoneResolution } from './types';

/**
 * Smart Converter — conversion (pipeline step 4).
 *
 * Builds the event's absolute instant from its wall-clock + resolved source zone,
 * then renders it in the viewer's target zone. This is the only place time math
 * happens, and it goes through Luxon so the offset is resolved **at the event's
 * own date** — "April 29, Pacific time" is automatically PDT (−7), not PST. (The
 * prototype's fixed-offset demo math is deliberately NOT used.)
 */

/** Luxon zone spec for the source side of the conversion. */
function sourceZone(z: ZoneResolution): string | LuxonZone {
  switch (z.kind) {
    case 'named':
    case 'inherited':
    case 'target':
      return z.iana;
    case 'offset':
      return FixedOffsetZone.instance(z.minutes);
  }
}

/** Human label for the source zone, for the "stated as …" line. */
function sourceZoneLabel(z: ZoneResolution, instant: DateTime): string {
  switch (z.kind) {
    case 'offset':
      return z.label;
    case 'named':
    case 'inherited':
      return currentAbbreviation(z.iana, instant);
    case 'target':
      return 'your time';
  }
}

function instantFrom(t: EventTime, zone: string | LuxonZone): DateTime {
  return DateTime.fromObject(
    { year: t.year, month: t.month, day: t.day, hour: t.hour, minute: t.minute },
    { zone },
  );
}

export function convert(
  ev: ResolvedEvent,
  targetIana: string,
  format: TimeFormat = '12',
): ConvertedEvent {
  const spec = sourceZone(ev.zone);
  const startDt = instantFrom(ev.start, spec);
  const localStart = startDt.setZone(targetIana);

  const endDt = ev.end ? instantFrom(ev.end, spec) : null;
  const localEnd = endDt ? endDt.setZone(targetIana) : null;

  const sourceClock = ev.start.timeImplied
    ? null
    : formatClock(ev.start.hour, ev.start.minute, format);
  const zoneLabel = sourceZoneLabel(ev.zone, startDt);

  return {
    startInstantMs: startDt.toMillis(),
    endInstantMs: endDt ? endDt.toMillis() : null,
    startDate: localStart.toFormat('cccc, MMM d'),
    startClock: ev.start.timeImplied ? '' : formatClock(localStart.hour, localStart.minute, format),
    endDate: localEnd ? localEnd.toFormat('cccc, MMM d') : null,
    endClock:
      localEnd && !(ev.end?.timeImplied ?? true)
        ? formatClock(localEnd.hour, localEnd.minute, format)
        : null,
    durationDays: endDt && localEnd ? Math.round(endDt.diff(startDt, 'days').days) : null,
    targetAbbr: currentAbbreviation(targetIana, startDt),
    targetOffsetLabel: formatUtcOffset(localStart.offset),
    sourceLabel: sourceClock ? `${sourceClock} ${zoneLabel}` : zoneLabel,
  };
}

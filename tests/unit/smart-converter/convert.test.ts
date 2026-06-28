import { getZoneByIana } from '@/data/zones';
import { convert } from '@/lib/smart-converter/convert';
import type { EventTime, ResolvedEvent, ZoneResolution } from '@/lib/smart-converter/types';
import { describe, expect, it } from 'vitest';

function ev(
  zone: ZoneResolution,
  start: Partial<EventTime>,
  end?: Partial<EventTime>,
): ResolvedEvent {
  const mk = (p: Partial<EventTime>): EventTime => ({
    year: 2026,
    month: 1,
    day: 15,
    hour: 12,
    minute: 0,
    timeImplied: false,
    ...p,
  });
  return {
    status: 'resolved',
    matchIndex: 0,
    matchText: '',
    zoneTokenText: null,
    zoneTokenIndex: null,
    zone,
    start: mk(start),
    end: end ? mk(end) : null,
    hasRange: !!end,
  };
}

const OFFSET8: ZoneResolution = { kind: 'offset', minutes: 480, label: 'UTC+8' };

describe('convert — DST correctness', () => {
  it('applies the TARGET offset for the event date, not today (summer vs winter)', () => {
    // 20:00 GMT+8 = 12:00 UTC. New York is EDT (−4) in July, EST (−5) in January.
    const summer = convert(ev(OFFSET8, { month: 7, hour: 20 }), 'America/New_York');
    const winter = convert(ev(OFFSET8, { month: 1, hour: 20 }), 'America/New_York');
    expect(summer.targetAbbr).toBe('EDT');
    expect(winter.targetAbbr).toBe('EST');
    expect(summer.startClock).toBe('8:00 am'); // 12:00 UTC −4
    expect(winter.startClock).toBe('7:00 am'); // 12:00 UTC −5
  });

  it('applies the SOURCE offset for the event date (LA is PDT in summer, PST in winter)', () => {
    const la = getZoneByIana('America/Los_Angeles');
    if (!la) throw new Error('America/Los_Angeles must be a curated zone');
    const namedLA = (): ZoneResolution => ({ kind: 'named', zone: la, iana: la.iana });
    // Noon LA → 19:00 UTC under PDT (−7), 20:00 UTC under PST (−8).
    const summer = convert(ev(namedLA(), { month: 7, hour: 12 }), 'UTC');
    const winter = convert(ev(namedLA(), { month: 1, hour: 12 }), 'UTC');
    expect(summer.startClock).toBe('7:00 pm');
    expect(winter.startClock).toBe('8:00 pm');
  });
});

describe('convert — ranges and implied time', () => {
  it('computes whole-day duration for a range', () => {
    const r = convert(
      ev(OFFSET8, { month: 9, day: 24 }, { month: 9, day: 27 }),
      'America/New_York',
    );
    expect(r.durationDays).toBe(3);
    expect(r.endDate).not.toBeNull();
  });

  it('omits the clock for a date-only event', () => {
    const r = convert(ev(OFFSET8, { month: 9, day: 24, timeImplied: true }), 'America/New_York');
    expect(r.startClock).toBe('');
    expect(r.sourceLabel).toBe('UTC+8');
  });
});

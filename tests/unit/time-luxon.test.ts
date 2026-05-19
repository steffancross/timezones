import { describe, expect, it } from 'vitest';
import {
  anchorToZones,
  currentAbbreviation,
  currentOffset,
  currentOffsetBetween,
  dayHours,
  nowIn,
} from '@/lib/time/luxon';

describe('nowIn', () => {
  it('returns a DateTime in the given zone', () => {
    const dt = nowIn('Asia/Tokyo');
    expect(dt.zoneName).toBe('Asia/Tokyo');
    expect(dt.isValid).toBe(true);
  });
});

describe('currentOffset', () => {
  it('returns the current offset for Tokyo (+540)', () => {
    expect(currentOffset('Asia/Tokyo')).toBe(540);
  });

  it('returns the current offset for UTC (0)', () => {
    expect(currentOffset('UTC')).toBe(0);
  });

  it('returns 0 or -60 for London (depending on BST)', () => {
    const offset = currentOffset('Europe/London');
    expect([0, 60]).toContain(offset);
  });
});

describe('currentOffsetBetween', () => {
  it('Tokyo vs New York is ~840 (winter, EST) or ~780 (summer, EDT)', () => {
    const diff = currentOffsetBetween('Asia/Tokyo', 'America/New_York');
    expect([780, 840]).toContain(diff);
  });

  it('returns the negative of the reverse', () => {
    const a = currentOffsetBetween('Asia/Tokyo', 'America/New_York');
    const b = currentOffsetBetween('America/New_York', 'Asia/Tokyo');
    expect(a).toBe(-b);
  });
});

describe('currentAbbreviation', () => {
  it('returns PST or PDT for Los Angeles', () => {
    const abbr = currentAbbreviation('America/Los_Angeles');
    expect(['PST', 'PDT']).toContain(abbr);
  });
});

describe('anchorToZones', () => {
  it('maps 3pm PDT May 14 to 6pm EDT same day and 7am JST next day', () => {
    const result = anchorToZones(15, '2026-05-14', 'America/Los_Angeles', [
      'America/New_York',
      'Asia/Tokyo',
    ]);

    const ny = result.get('America/New_York');
    expect(ny).toEqual({ hour: 18, date: '2026-05-14', day_delta: 0 });

    const tokyo = result.get('Asia/Tokyo');
    expect(tokyo).toEqual({ hour: 7, date: '2026-05-15', day_delta: 1 });
  });

  it('returns same hour for the home zone', () => {
    const result = anchorToZones(9, '2026-01-15', 'Europe/London', ['Europe/London']);
    const london = result.get('Europe/London');
    expect(london).toEqual({ hour: 9, date: '2026-01-15', day_delta: 0 });
  });
});

describe('dayHours', () => {
  it('returns 24 entries for one day', () => {
    const hours = dayHours('America/New_York', '2026-05-14');
    expect(hours).toHaveLength(24);
  });

  it('first entry is hour 0 and marked midnight', () => {
    const hours = dayHours('America/New_York', '2026-05-14');
    expect(hours[0]?.hour).toBe(0);
    expect(hours[0]?.isMidnight).toBe(true);
    expect(hours[1]?.isMidnight).toBe(false);
  });

  it('iso strings are sequential by hour', () => {
    const hours = dayHours('America/New_York', '2026-05-14');
    expect(hours.map((h) => h.hour)).toEqual(Array.from({ length: 24 }, (_, i) => i));
  });
});

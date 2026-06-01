import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import {
  anchorToZones,
  currentOffset,
  currentOffsetBetween,
  nowIn,
  projectAnchorDay,
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

describe('projectAnchorDay', () => {
  // The oracle: projectAnchorDay must match anchorToZones for every hour, on
  // hour/date/day_delta, plus expose the correct local minute.
  const cases: Array<{ name: string; date: string; home: string; target: string }> = [
    { name: 'same zone', date: '2026-05-14', home: 'Asia/Tokyo', target: 'Asia/Tokyo' },
    {
      name: 'whole-hour',
      date: '2026-05-14',
      home: 'America/Los_Angeles',
      target: 'America/New_York',
    },
    {
      name: 'half-hour (+5:30)',
      date: '2026-05-14',
      home: 'Europe/London',
      target: 'Asia/Kolkata',
    },
    {
      name: 'quarter-hour (+5:45)',
      date: '2026-05-14',
      home: 'Europe/London',
      target: 'Asia/Kathmandu',
    },
    {
      name: 'westward straddle',
      date: '2026-05-14',
      home: 'Asia/Tokyo',
      target: 'America/Los_Angeles',
    },
    // DST days — these force the per-hour fallback path.
    {
      name: 'home spring-forward',
      date: '2026-03-08',
      home: 'America/New_York',
      target: 'Asia/Tokyo',
    },
    {
      name: 'home fall-back',
      date: '2026-11-01',
      home: 'America/New_York',
      target: 'Asia/Tokyo',
    },
    {
      name: 'target transition (London BST)',
      date: '2026-03-29',
      home: 'America/New_York',
      target: 'Europe/London',
    },
  ];

  for (const { name, date, home, target } of cases) {
    it(`matches anchorToZones for all 24 hours — ${name}`, () => {
      const projected = projectAnchorDay(date, home, target);
      expect(projected).toHaveLength(24);
      for (let h = 0; h < 24; h++) {
        const oracle = anchorToZones(h, date, home, [target]).get(target);
        const entry = projected[h];
        expect(entry).toBeDefined();
        expect({ hour: entry?.hour, date: entry?.date, day_delta: entry?.day_delta }).toEqual(
          oracle,
        );
        const expectedMinute = DateTime.fromISO(date, { zone: home })
          .set({ hour: h })
          .setZone(target).minute;
        expect(entry?.minute).toBe(expectedMinute);
      }
    });
  }

  it('returns identity entries for an invalid anchor date', () => {
    const projected = projectAnchorDay('not-a-date', 'America/New_York', 'Asia/Tokyo');
    expect(projected).toHaveLength(24);
    expect(projected[5]).toEqual({ hour: 5, minute: 0, date: 'not-a-date', day_delta: 0 });
  });
});

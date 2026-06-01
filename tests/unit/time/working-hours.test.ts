import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { zoneObservesDst } from '@/lib/time/luxon';
import {
  computeBusinessOverlap,
  DEFAULT_WORKING_HOURS,
  EXTENDED_WORKING_HOURS,
  getWorkingHoursOnDay,
  isWorkingHour,
  WORKING_HOURS_STORAGE_KEY,
  type WorkingHours,
} from '@/lib/time/working-hours';

// 2024-01-15 was a Monday (winter / standard time for northern-hemisphere
// DST zones). 2024-07-15 was also a Monday (summer / DST active). We pick
// 12:00 UTC so the reference still lands inside the same calendar Monday
// after `setZone(fromIana)` in any zone (offsets are within ±14h, so noon
// UTC never crosses a date boundary far enough to land on a different week).
const JAN_MONDAY = DateTime.fromObject(
  { year: 2024, month: 1, day: 15, hour: 12 },
  { zone: 'UTC' },
);
const JUL_MONDAY = DateTime.fromObject(
  { year: 2024, month: 7, day: 15, hour: 12 },
  { zone: 'UTC' },
);

describe('isWorkingHour', () => {
  it('returns true for 10am on Wednesday with default 9-5 M-F', () => {
    expect(isWorkingHour(10, 3)).toBe(true);
  });

  it('returns false for 8am (before start)', () => {
    expect(isWorkingHour(8, 3)).toBe(false);
  });

  it('returns false for 5pm (end is exclusive — clock-out, not a worked hour)', () => {
    expect(isWorkingHour(17, 3)).toBe(false);
  });

  it('returns true for 4pm (last worked hour of a 9-5 day)', () => {
    expect(isWorkingHour(16, 3)).toBe(true);
  });

  it('returns false for 6pm (past end)', () => {
    expect(isWorkingHour(18, 3)).toBe(false);
  });

  it('returns false for Saturday', () => {
    expect(isWorkingHour(10, 6)).toBe(false);
  });

  it('returns false for Sunday', () => {
    expect(isWorkingHour(10, 7)).toBe(false);
  });

  it('returns true for start hour (inclusive)', () => {
    expect(isWorkingHour(9, 1)).toBe(true);
  });

  it('returns false for the end hour itself (exclusive)', () => {
    expect(isWorkingHour(17, 5)).toBe(false);
  });

  it('respects custom WorkingHours config', () => {
    const wh: WorkingHours = { start: 8, end: 20, days: [6, 7] };
    expect(isWorkingHour(10, 6, wh)).toBe(true);
    expect(isWorkingHour(10, 1, wh)).toBe(false);
    expect(isWorkingHour(19, 6, wh)).toBe(true);
    expect(isWorkingHour(20, 6, wh)).toBe(false);
  });
});

describe('getWorkingHoursOnDay', () => {
  it('returns 9..16 for Monday with default config (8-hour 9-5 day, end exclusive)', () => {
    expect(getWorkingHoursOnDay(1)).toEqual([9, 10, 11, 12, 13, 14, 15, 16]);
  });

  it('returns empty array for Sunday by default', () => {
    expect(getWorkingHoursOnDay(7)).toEqual([]);
  });

  it('returns empty array for Saturday by default', () => {
    expect(getWorkingHoursOnDay(6)).toEqual([]);
  });

  it('respects custom WorkingHours config', () => {
    const wh: WorkingHours = { start: 14, end: 18, days: [6] };
    expect(getWorkingHoursOnDay(6, wh)).toEqual([14, 15, 16, 17]);
    expect(getWorkingHoursOnDay(1, wh)).toEqual([]);
  });
});

describe('exports', () => {
  it('DEFAULT_WORKING_HOURS is 9-17 Mon-Fri', () => {
    expect(DEFAULT_WORKING_HOURS).toEqual({
      start: 9,
      end: 17,
      days: [1, 2, 3, 4, 5],
    });
  });

  it('EXTENDED_WORKING_HOURS is 7-20 Mon-Fri', () => {
    expect(EXTENDED_WORKING_HOURS).toEqual({
      start: 7,
      end: 20,
      days: [1, 2, 3, 4, 5],
    });
  });

  it('WORKING_HOURS_STORAGE_KEY is stable', () => {
    expect(WORKING_HOURS_STORAGE_KEY).toBe('working_hours');
  });
});

describe('computeBusinessOverlap', () => {
  it('1-hour delta (Osaka → Beijing) yields a 7-hour same-day window', () => {
    // Asia/Tokyo (UTC+9) → Asia/Shanghai (UTC+8): worked from-hours 9-16 map to
    // to-hours 8-15. From-9 maps to to-8 (out of range) so window starts at 10;
    // from-16 maps to to-15 (last worked hour). End is exclusive: fromEnd 17,
    // toEnd 16. This is the case that the original today-anchored implementation
    // broke on whenever today happened to be a weekend.
    const windows = computeBusinessOverlap('Asia/Tokyo', 'Asia/Shanghai', undefined, JAN_MONDAY);
    expect(windows).toEqual([
      {
        fromStartHour: 10,
        fromEndHour: 17,
        toStartHour: 9,
        toEndHour: 16,
        toDayDelta: 0,
      },
    ]);
  });

  it('3-hour delta (LA → NYC) yields a 5-hour same-day window', () => {
    // America/Los_Angeles → America/New_York: worked from-9 = to-12 … from-13 =
    // to-16 (last worked hour); from-14 = to-17 is out (17 is clock-out,
    // exclusive). Window: from 9-13 = to 12-16, exclusive ends fromEnd 14 /
    // toEnd 17.
    const windows = computeBusinessOverlap(
      'America/Los_Angeles',
      'America/New_York',
      undefined,
      JAN_MONDAY,
    );
    expect(windows).toEqual([
      {
        fromStartHour: 9,
        fromEndHour: 14,
        toStartHour: 12,
        toEndHour: 17,
        toDayDelta: 0,
      },
    ]);
  });

  it('wide gap (LA → Tokyo) yields only a tiny cross-day window', () => {
    // LA UTC-8 vs Tokyo UTC+9 = 17h delta. LA Mon 9-15 fall well outside Tokyo
    // working hours, and LA Mon 16:00 = Tokyo Tue 09:00 — the one boundary hour
    // where both are working, with `toDayDelta = +1`. (LA 17:00 = Tokyo 10:00 is
    // no longer included: 17 is clock-out under the exclusive-end model.) This is
    // the case the previous fallback message ("don't overlap") completely missed.
    const windows = computeBusinessOverlap(
      'America/Los_Angeles',
      'Asia/Tokyo',
      undefined,
      JAN_MONDAY,
    );
    expect(windows).toEqual([
      {
        fromStartHour: 16,
        fromEndHour: 17,
        toStartHour: 9,
        toEndHour: 10,
        toDayDelta: 1,
      },
    ]);
  });

  it('antipode-ish (Auckland → Reykjavik) yields no overlap', () => {
    // Auckland UTC+13 (NZDT) vs Reykjavik UTC+0 = 13h delta with Auckland
    // ahead. Auckland 9-16 maps to Reykjavik Sun 20:00 through Mon 03:00 —
    // none inside working hours.
    const windows = computeBusinessOverlap(
      'Pacific/Auckland',
      'Atlantic/Reykjavik',
      undefined,
      JAN_MONDAY,
    );
    expect(windows).toEqual([]);
  });

  it('EXTENDED_WORKING_HOURS recovers a fringe slot where 9–5 finds none (London → Tokyo)', () => {
    // London UTC+0 vs Tokyo UTC+9. Standard 9–17 misses entirely: London 9–17
    // is Tokyo 18:00–02:00, all outside Tokyo working hours.
    const standard = computeBusinessOverlap('Europe/London', 'Asia/Tokyo', undefined, JAN_MONDAY);
    expect(standard).toEqual([]);

    // Widening to 7am–8pm (worked 7..19, exclusive end) catches London's
    // morning against Tokyo's evening: worked London 7–10 = Tokyo 16–19, same
    // calendar day. Exclusive ends → fromEnd 11 / toEnd 20.
    const extended = computeBusinessOverlap(
      'Europe/London',
      'Asia/Tokyo',
      EXTENDED_WORKING_HOURS,
      JAN_MONDAY,
    );
    expect(extended).toEqual([
      {
        fromStartHour: 7,
        fromEndHour: 11,
        toStartHour: 16,
        toEndHour: 20,
        toDayDelta: 0,
      },
    ]);
  });

  it('near-antipodal extended overlap yields one fringe window (London → Auckland)', () => {
    // London UTC+0 vs Auckland UTC+13 (NZDT in January) = 13h delta. Standard
    // 9–5 misses entirely. With the exclusive-end model the extended window
    // (worked 7..19) catches only London's evening against Auckland's next-day
    // morning: worked London 18–19 = Auckland 7–8 the next day. The early
    // shoulder (London 7am = Auckland 20:00) is gone — 20:00 is clock-out, not a
    // worked hour, so it no longer counts.
    const standard = computeBusinessOverlap(
      'Europe/London',
      'Pacific/Auckland',
      undefined,
      JAN_MONDAY,
    );
    expect(standard).toEqual([]);

    const extended = computeBusinessOverlap(
      'Europe/London',
      'Pacific/Auckland',
      EXTENDED_WORKING_HOURS,
      JAN_MONDAY,
    );
    expect(extended).toEqual([
      // London 6–8pm (worked 18,19) = Auckland 7–9am, next day.
      { fromStartHour: 18, fromEndHour: 20, toStartHour: 7, toEndHour: 9, toDayDelta: 1 },
    ]);
  });

  it('same zone yields the full default working-hours window', () => {
    const windows = computeBusinessOverlap('Asia/Tokyo', 'Asia/Tokyo', undefined, JAN_MONDAY);
    expect(windows).toEqual([
      {
        fromStartHour: 9,
        fromEndHour: 17,
        toStartHour: 9,
        toEndHour: 17,
        toDayDelta: 0,
      },
    ]);
  });

  it('regression: weekend reference normalizes to the same Monday — result is stable', () => {
    // Caller passes a Saturday DateTime. The function calls startOf('week') and
    // should land on the preceding Monday, yielding the same answer as passing
    // that Monday directly. This is the guard against the original today-
    // anchored bug ("don't overlap" appearing on weekends).
    const saturday = DateTime.fromObject(
      { year: 2024, month: 1, day: 20, hour: 12 },
      { zone: 'UTC' },
    );
    const sunday = DateTime.fromObject(
      { year: 2024, month: 1, day: 21, hour: 12 },
      { zone: 'UTC' },
    );
    const fromSaturday = computeBusinessOverlap('Asia/Tokyo', 'Asia/Shanghai', undefined, saturday);
    const fromSunday = computeBusinessOverlap('Asia/Tokyo', 'Asia/Shanghai', undefined, sunday);
    const fromMonday = computeBusinessOverlap('Asia/Tokyo', 'Asia/Shanghai', undefined, JAN_MONDAY);
    expect(fromSaturday).toEqual(fromMonday);
    expect(fromSunday).toEqual(fromMonday);
  });

  it('DST drift: Phoenix → NYC window shrinks from 6h (winter) to 5h (summer)', () => {
    // Phoenix doesn't observe DST; NYC does. So the offset between them is
    // 2h in winter and 3h in summer. With exclusive-end worked hours (9..16):
    // winter Phoenix 9-14 = NYC 11-16; summer Phoenix 9-13 = NYC 12-16.
    const winter = computeBusinessOverlap(
      'America/Phoenix',
      'America/New_York',
      undefined,
      JAN_MONDAY,
    );
    const summer = computeBusinessOverlap(
      'America/Phoenix',
      'America/New_York',
      undefined,
      JUL_MONDAY,
    );
    expect(winter).toEqual([
      {
        fromStartHour: 9,
        fromEndHour: 15,
        toStartHour: 11,
        toEndHour: 17,
        toDayDelta: 0,
      },
    ]);
    expect(summer).toEqual([
      {
        fromStartHour: 9,
        fromEndHour: 14,
        toStartHour: 12,
        toEndHour: 17,
        toDayDelta: 0,
      },
    ]);
  });

  it('respects a custom WorkingHours config', () => {
    const wh: WorkingHours = { start: 8, end: 18, days: [1, 2, 3, 4, 5] };
    const windows = computeBusinessOverlap('Asia/Tokyo', 'Asia/Shanghai', wh, JAN_MONDAY);
    expect(windows).toEqual([
      {
        fromStartHour: 9,
        fromEndHour: 18,
        toStartHour: 8,
        toEndHour: 17,
        toDayDelta: 0,
      },
    ]);
  });
});

describe('zoneObservesDst', () => {
  it('returns true for zones that observe DST', () => {
    expect(zoneObservesDst('America/Los_Angeles')).toBe(true);
    expect(zoneObservesDst('America/New_York')).toBe(true);
    expect(zoneObservesDst('Europe/London')).toBe(true);
  });

  it('returns false for zones that do not observe DST', () => {
    expect(zoneObservesDst('Asia/Tokyo')).toBe(false);
    expect(zoneObservesDst('America/Phoenix')).toBe(false);
    expect(zoneObservesDst('Asia/Shanghai')).toBe(false);
  });
});

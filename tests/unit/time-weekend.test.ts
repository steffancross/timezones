import { describe, expect, it } from 'vitest';
import { getWeekendDays, isWeekend, WEEKEND_DAYS } from '@/lib/time/weekend';

describe('isWeekend', () => {
  it('returns true for Saturday (6)', () => {
    expect(isWeekend(6)).toBe(true);
  });

  it('returns true for Sunday (7)', () => {
    expect(isWeekend(7)).toBe(true);
  });

  it('returns false for weekdays (1-5)', () => {
    expect(isWeekend(1)).toBe(false);
    expect(isWeekend(2)).toBe(false);
    expect(isWeekend(3)).toBe(false);
    expect(isWeekend(4)).toBe(false);
    expect(isWeekend(5)).toBe(false);
  });
});

describe('getWeekendDays', () => {
  it('returns [6, 7]', () => {
    expect(getWeekendDays()).toEqual([6, 7]);
  });
});

describe('WEEKEND_DAYS', () => {
  it('contains 6 and 7', () => {
    expect(WEEKEND_DAYS.has(6)).toBe(true);
    expect(WEEKEND_DAYS.has(7)).toBe(true);
  });

  it('does not contain weekdays', () => {
    expect(WEEKEND_DAYS.has(1)).toBe(false);
    expect(WEEKEND_DAYS.has(5)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WORKING_HOURS,
  getWorkingHoursOnDay,
  isWorkingHour,
  WORKING_HOURS_STORAGE_KEY,
  type WorkingHours,
} from '@/lib/time/working-hours';

describe('isWorkingHour', () => {
  it('returns true for 10am on Wednesday with default 9-5 M-F', () => {
    expect(isWorkingHour(10, 3)).toBe(true);
  });

  it('returns false for 8am (before start)', () => {
    expect(isWorkingHour(8, 3)).toBe(false);
  });

  it('returns false for 5pm (end is exclusive)', () => {
    expect(isWorkingHour(17, 3)).toBe(false);
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

  it('returns true for end - 1 (last working hour)', () => {
    expect(isWorkingHour(16, 5)).toBe(true);
  });

  it('respects custom WorkingHours config', () => {
    const wh: WorkingHours = { start: 8, end: 20, days: [6, 7] };
    expect(isWorkingHour(10, 6, wh)).toBe(true);
    expect(isWorkingHour(10, 1, wh)).toBe(false);
    expect(isWorkingHour(20, 6, wh)).toBe(false);
  });
});

describe('getWorkingHoursOnDay', () => {
  it('returns 9..16 for Monday with default config', () => {
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

  it('WORKING_HOURS_STORAGE_KEY is stable', () => {
    expect(WORKING_HOURS_STORAGE_KEY).toBe('working_hours');
  });
});

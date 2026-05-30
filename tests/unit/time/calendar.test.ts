import { WEEKDAY_LABELS, buildMonthGrid } from '@/lib/time/calendar';
import { describe, expect, it } from 'vitest';

describe('buildMonthGrid', () => {
  it('returns 42 cells (6 weeks)', () => {
    expect(buildMonthGrid(2026, 5)).toHaveLength(42);
  });

  it('is Sunday-first: first cell is a Sunday', () => {
    // May 2026: the 1st is a Friday, so the grid starts on Sun Apr 26.
    const grid = buildMonthGrid(2026, 5);
    expect(grid.at(0)?.iso).toBe('2026-04-26');
    expect(grid.at(0)?.inMonth).toBe(false);
  });

  it('places the 1st of the month at the correct offset', () => {
    // Fri May 1 2026 → Sun=0..Fri=5, so index 5.
    const may1 = buildMonthGrid(2026, 5).at(5);
    expect(may1?.iso).toBe('2026-05-01');
    expect(may1?.day).toBe(1);
    expect(may1?.inMonth).toBe(true);
    expect(may1?.isWeekend).toBe(false);
  });

  it('flags weekends (Sat/Sun) and only those', () => {
    const grid = buildMonthGrid(2026, 5);
    // Sunday-first: column 0 (Sun) and column 6 (Sat) are weekends every row.
    grid.forEach((cell, i) => {
      expect(cell.isWeekend).toBe(i % 7 === 0 || i % 7 === 6);
    });
  });

  it('marks leading/trailing spill days as out-of-month', () => {
    const grid = buildMonthGrid(2026, 5);
    expect(grid.find((c) => c.iso === '2026-05-31')?.inMonth).toBe(true);
    // June spill stays out-of-month.
    expect(grid.find((c) => c.iso === '2026-06-01')?.inMonth).toBe(false);
  });

  it('handles a month that starts on Sunday with no leading spill', () => {
    // November 2026: the 1st is a Sunday.
    const grid = buildMonthGrid(2026, 11);
    expect(grid.at(0)?.iso).toBe('2026-11-01');
    expect(grid.at(0)?.inMonth).toBe(true);
  });

  it('exposes 7 Sunday-first weekday labels', () => {
    expect(WEEKDAY_LABELS).toHaveLength(7);
    expect(WEEKDAY_LABELS.at(0)).toBe('Sun');
    expect(WEEKDAY_LABELS.at(6)).toBe('Sat');
  });
});

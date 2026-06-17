import { describe, expect, it } from 'vitest';
import { DateTime } from '@/lib/time/luxon';
import { todayWindows, weekWindows } from '@/lib/rooms/compute/windows';
import type { ComputeInput } from '@/lib/rooms/compute/types';
import {
  FIXTURE_NOW,
  FIXTURE_ROOM,
  FIXTURE_VIEWER_TZ,
  FIXTURE_WEEK_ANCHOR,
} from '@/lib/rooms/fixtures';

const base: ComputeInput = {
  room: FIXTURE_ROOM,
  viewerTz: FIXTURE_VIEWER_TZ,
  weekAnchor: FIXTURE_WEEK_ANCHOR,
  now: FIXTURE_NOW,
};
const at = (iso: string) => DateTime.fromISO(iso, { zone: 'UTC' }).toMillis();

describe('weekWindows (fixture)', () => {
  it('ranks the all-green Monday window above the some-grade Tuesday window', () => {
    const windows = weekWindows(base);
    expect(windows).toHaveLength(2);
    // Monday 09:00–11:00 NY = 14:00–16:00Z = slots 18..21, everyone in.
    expect(windows[0]).toMatchObject({
      day: 1,
      startSlot: 18,
      endSlot: 21,
      grade: 'all',
      softPeople: [],
    });
    // Tuesday 09:00–10:00 NY = 14:00–15:00Z = slots 18..19, Sam if-needed.
    expect(windows[1]).toMatchObject({
      day: 2,
      startSlot: 18,
      endSlot: 19,
      grade: 'some',
      softPeople: ['sam'],
    });
  });

  it('drops fully-past windows and truncates a straddling window to its future part', () => {
    // now = Monday 15:00Z (NY 10:00): Monday window's first two cells are past.
    const windows = weekWindows({ ...base, now: at('2026-01-05T15:00:00') });
    const monday = windows.find((w) => w.day === 1);
    expect(monday).toMatchObject({ startSlot: 20, endSlot: 21, grade: 'all' });
    // Tuesday window is wholly future → still present.
    expect(windows.some((w) => w.day === 2)).toBe(true);
  });
});

describe('todayWindows (fixture)', () => {
  it('is empty on Sunday — no full overlap that day', () => {
    expect(todayWindows(base)).toEqual([]);
  });

  it("returns the day's future windows when now is that morning", () => {
    // now = Monday 08:00Z (NY 03:00) → today is Monday, the 14:00Z window is still future.
    const windows = todayWindows({ ...base, now: at('2026-01-05T08:00:00') });
    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({ day: 1, startSlot: 18, endSlot: 21, grade: 'all' });
  });
});

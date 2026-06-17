import { describe, expect, it } from 'vitest';
import { DateTime } from '@/lib/time/luxon';
import { getTransitionsForYear } from '@/lib/time/dst';
import {
  currentWeekAnchor,
  participantSlotAt,
  viewerCellInstant,
  viewerWeekStart,
} from '@/lib/rooms/compute/cells';

const ms = (iso: string, zone = 'UTC') => DateTime.fromISO(iso, { zone }).toMillis();
const daysBetween = (a: string, b: string) =>
  Math.round(DateTime.fromISO(b).diff(DateTime.fromISO(a), 'days').days);

describe('currentWeekAnchor', () => {
  it('walks back to the Sunday on/before now (Tue, Sun, Sat → same Sunday)', () => {
    const tz = 'America/New_York';
    expect(currentWeekAnchor(tz, ms('2026-06-16T12:00', tz))).toBe('2026-06-14'); // Tue
    expect(currentWeekAnchor(tz, ms('2026-06-14T01:00', tz))).toBe('2026-06-14'); // Sun
    expect(currentWeekAnchor(tz, ms('2026-06-20T23:00', tz))).toBe('2026-06-14'); // Sat
  });
});

describe('viewerWeekStart', () => {
  it('throws on a non-Sunday anchor and on an invalid date', () => {
    expect(() => viewerWeekStart('2026-06-15', 'UTC')).toThrow(/not a Sunday/);
    expect(() => viewerWeekStart('not-a-date', 'UTC')).toThrow(/invalid/);
    expect(() => viewerWeekStart('2026-06-14', 'UTC')).not.toThrow();
  });
});

describe('viewerCellInstant — DST edges', () => {
  it('flags the spring-forward gap cells as nonexistent (not silently shifted)', () => {
    const tz = 'America/New_York';
    const spring = getTransitionsForYear(tz, 2026).find((t) => t.direction === 'forward');
    if (!spring) throw new Error('no spring transition found');
    const anchor = currentWeekAnchor(tz, spring.date.toMillis());
    const d = daysBetween(anchor, spring.date.setZone(tz).toISODate() ?? '');

    // NY springs 02:00→03:00, so 02:00 (k=4) and 02:30 (k=5) don't exist; 01:30 and 03:00 do.
    expect(viewerCellInstant(anchor, d, 4, tz).nonexistent).toBe(true);
    expect(viewerCellInstant(anchor, d, 5, tz).nonexistent).toBe(true);
    expect(viewerCellInstant(anchor, d, 3, tz).nonexistent).toBe(false);
    expect(viewerCellInstant(anchor, d, 6, tz).nonexistent).toBe(false);
  });

  it('resolves the fall-back ambiguous hour to the EARLIER offset (Luxon default, pinned)', () => {
    const tz = 'America/New_York';
    const fall = getTransitionsForYear(tz, 2026).find((t) => t.direction === 'back');
    if (!fall) throw new Error('no fall transition found');
    const anchor = currentWeekAnchor(tz, fall.date.toMillis());
    const d = daysBetween(anchor, fall.date.setZone(tz).toISODate() ?? '');

    // 01:00 (k=2) and 01:30 (k=3) occur twice; the earlier side is offsetBefore (EDT, -240).
    const cell = viewerCellInstant(anchor, d, 3, tz);
    expect(cell.nonexistent).toBe(false);
    expect(DateTime.fromMillis(cell.millis).setZone(tz).offset).toBe(fall.offsetBefore);
  });

  it('never flags anything in a no-DST viewer zone', () => {
    for (let k = 0; k < 48; k++) {
      expect(viewerCellInstant('2026-03-08', 0, k, 'UTC').nonexistent).toBe(false);
    }
  });
});

describe('participantSlotAt — fractional offsets (sample-at-start)', () => {
  it('+5:45 Kathmandu buckets to the containing half-hour slot', () => {
    const tz = 'Asia/Kathmandu';
    // 03:00 UTC → 08:45 NPT → slot 17 (08:30); 03:30 UTC → 09:15 NPT → slot 18 (09:00).
    expect(participantSlotAt(ms('2026-01-05T03:00'), tz).halfHour).toBe(17);
    expect(participantSlotAt(ms('2026-01-05T03:30'), tz).halfHour).toBe(18);
  });

  it('maps Sunday via blobDow (Luxon Sun=7 → storage 6)', () => {
    // 2026-01-04 is a Sunday; pick an instant clearly inside that UTC day.
    expect(participantSlotAt(ms('2026-01-04T12:00'), 'UTC').dow).toBe(6);
  });
});

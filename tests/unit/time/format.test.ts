import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import {
  formatClock,
  formatDate,
  formatDayDelta,
  formatHourTile,
  formatOffset,
  formatTime,
} from '@/lib/time/format';

describe('formatClock', () => {
  it('12-hour: midnight, noon, and pm with minutes', () => {
    expect(formatClock(0, 0, '12')).toBe('12:00 am');
    expect(formatClock(12, 0, '12')).toBe('12:00 pm');
    expect(formatClock(15, 30, '12')).toBe('3:30 pm');
    expect(formatClock(9, 45, '12')).toBe('9:45 am');
  });

  it('24-hour pads hours and minutes', () => {
    expect(formatClock(0, 0, '24')).toBe('00:00');
    expect(formatClock(9, 5, '24')).toBe('09:05');
    expect(formatClock(23, 30, '24')).toBe('23:30');
  });

  it('matches formatTime for arbitrary DateTimes, including half-hour zones', () => {
    const samples = [
      DateTime.fromISO('2026-05-14T15:00', { zone: 'America/Los_Angeles' }),
      DateTime.fromISO('2026-05-14T00:00', { zone: 'UTC' }),
      DateTime.fromISO('2026-05-14T12:00', { zone: 'UTC' }).setZone('Asia/Kolkata'),
      DateTime.fromISO('2026-05-14T12:00', { zone: 'UTC' }).setZone('Asia/Kathmandu'),
    ];
    for (const dt of samples) {
      expect(formatClock(dt.hour, dt.minute, '12')).toBe(formatTime(dt, '12'));
      expect(formatClock(dt.hour, dt.minute, '24')).toBe(formatTime(dt, '24'));
    }
  });
});

describe('formatTime', () => {
  const dt = DateTime.fromISO('2026-05-14T15:00', { zone: 'America/Los_Angeles' });

  it('formats 12-hour with lowercase am/pm', () => {
    expect(formatTime(dt, '12')).toBe('3:00 pm');
  });

  it('formats 24-hour with leading zero', () => {
    expect(formatTime(dt, '24')).toBe('15:00');
  });
});

describe('formatHourTile', () => {
  it('12-hour: 0 → 12a', () => {
    expect(formatHourTile(0, '12')).toBe('12a');
  });

  it('12-hour: 11 → 11a', () => {
    expect(formatHourTile(11, '12')).toBe('11a');
  });

  it('12-hour: 12 → 12p', () => {
    expect(formatHourTile(12, '12')).toBe('12p');
  });

  it('12-hour: 13 → 1p', () => {
    expect(formatHourTile(13, '12')).toBe('1p');
  });

  it('12-hour: 23 → 11p', () => {
    expect(formatHourTile(23, '12')).toBe('11p');
  });

  it('24-hour pads single-digit hours', () => {
    expect(formatHourTile(0, '24')).toBe('00');
    expect(formatHourTile(9, '24')).toBe('09');
    expect(formatHourTile(13, '24')).toBe('13');
    expect(formatHourTile(23, '24')).toBe('23');
  });
});

describe('formatDate', () => {
  it('formats as "ccc, MMM d"', () => {
    const dt = DateTime.fromISO('2026-05-14', { zone: 'UTC' });
    expect(formatDate(dt)).toBe('Thu, May 14');
  });
});

describe('formatOffset', () => {
  it('returns UTC for 0', () => {
    expect(formatOffset(0)).toBe('UTC');
  });

  it('returns UTC+1 for 60', () => {
    expect(formatOffset(60)).toBe('UTC+1');
  });

  it('returns UTC-8 for -480', () => {
    expect(formatOffset(-480)).toBe('UTC-8');
  });

  it('returns UTC+5:30 for 330', () => {
    expect(formatOffset(330)).toBe('UTC+5:30');
  });

  it('returns UTC-3:30 for -210', () => {
    expect(formatOffset(-210)).toBe('UTC-3:30');
  });
});

describe('formatDayDelta', () => {
  it('returns empty string for 0', () => {
    expect(formatDayDelta(0)).toBe('');
  });

  it('returns +1 day for 1', () => {
    expect(formatDayDelta(1)).toBe('+1 day');
  });

  it('returns -1 day for -1', () => {
    expect(formatDayDelta(-1)).toBe('-1 day');
  });

  it('returns +2 days for 2', () => {
    expect(formatDayDelta(2)).toBe('+2 days');
  });
});

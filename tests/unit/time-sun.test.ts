import { describe, expect, it } from 'vitest';
import { getNightHours, getSunTimes } from '@/lib/time/sun';

describe('getSunTimes — NYC', () => {
  it('summer solstice gives ~15h day, sunrise ~5:25am', () => {
    const result = getSunTimes('America/New_York', '2026-06-21', 40.7, -74.0);
    expect(result.isFallback).toBe(false);
    // ~5am local
    expect(result.sunrise.hour).toBe(5);
    // Day length around 15h (~900 min). Allow 30-min slack.
    expect(result.dayLengthMinutes).toBeGreaterThan(870);
    expect(result.dayLengthMinutes).toBeLessThan(930);
  });

  it('winter solstice gives ~9h day, late sunrise', () => {
    const result = getSunTimes('America/New_York', '2026-12-21', 40.7, -74.0);
    expect(result.isFallback).toBe(false);
    expect(result.sunrise.hour).toBeGreaterThanOrEqual(7);
    expect(result.dayLengthMinutes).toBeLessThan(600);
  });
});

describe('getSunTimes — polar fallbacks', () => {
  it('Antarctica/Troll June 21 (southern winter) returns 24h-night fallback', () => {
    const result = getSunTimes('Antarctica/Troll', '2026-06-21', -72, 2.5);
    expect(result.isFallback).toBe(true);
    expect(result.dayLengthMinutes).toBe(0);
  });

  it('Antarctica/Troll Dec 21 (southern summer) returns 24h-daylight fallback', () => {
    const result = getSunTimes('Antarctica/Troll', '2026-12-21', -72, 2.5);
    expect(result.isFallback).toBe(true);
    expect(result.dayLengthMinutes).toBe(1440);
  });
});

describe('getSunTimes — caching', () => {
  it('returns the identical object on repeated calls', () => {
    const a = getSunTimes('America/New_York', '2026-06-21', 40.7, -74.0);
    const b = getSunTimes('America/New_York', '2026-06-21', 40.7, -74.0);
    expect(a).toBe(b);
  });
});

describe('getNightHours — NYC', () => {
  it('winter solstice includes early-morning and late-evening hours', () => {
    const hours = getNightHours('America/New_York', '2026-12-21', 40.7, -74.0);
    // Pre-dawn hours
    expect(hours).toContain(0);
    expect(hours).toContain(6);
    // Post-sunset hours
    expect(hours).toContain(17);
    expect(hours).toContain(23);
    // Midday should not be night
    expect(hours).not.toContain(12);
  });

  it('summer solstice has fewer night hours than winter', () => {
    const summer = getNightHours('America/New_York', '2026-06-21', 40.7, -74.0);
    const winter = getNightHours('America/New_York', '2026-12-21', 40.7, -74.0);
    expect(summer.length).toBeLessThan(winter.length);
  });
});

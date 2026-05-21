import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadPersistedPrefs } from '@/lib/store/persistence';

const KEY = 'converter_prefs';

function set(value: unknown) {
  localStorage.setItem(KEY, JSON.stringify(value));
}

describe('loadPersistedPrefs', () => {
  beforeEach(() => localStorage.removeItem(KEY));
  afterEach(() => localStorage.removeItem(KEY));

  it('returns null when nothing stored', () => {
    expect(loadPersistedPrefs()).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    localStorage.setItem(KEY, '{not valid');
    expect(loadPersistedPrefs()).toBeNull();
  });

  it('round-trips a valid pref shape (overlay + workingHours only)', () => {
    set({
      overlay: { dayNight: true, workHours: true, weekend: true },
      workingHours: { start: 8, end: 18, days: [1, 2, 3, 4, 5] },
    });
    const prefs = loadPersistedPrefs();
    expect(prefs).toEqual({
      overlay: { dayNight: true, workHours: true, weekend: true },
      workingHours: { start: 8, end: 18, days: [1, 2, 3, 4, 5] },
    });
  });

  it('ignores a persisted `format` field — format is intentionally not persisted', () => {
    // Defends the "12 by default on every page" decision. If format ever
    // sneaks back into persistence, this fails loudly.
    set({
      format: '24',
      overlay: { dayNight: true, workHours: false, weekend: false },
      workingHours: { start: 9, end: 17, days: [1, 2, 3, 4, 5] },
    });
    const prefs = loadPersistedPrefs();
    expect(prefs).not.toHaveProperty('format');
  });

  it('coerces missing overlay flags to false', () => {
    set({ overlay: {} });
    expect(loadPersistedPrefs()?.overlay).toEqual({
      dayNight: false,
      workHours: false,
      weekend: false,
    });
  });

  it('falls back to default workingHours on corrupt shape (start out of range)', () => {
    set({ workingHours: { start: 99, end: 5, days: [1] } });
    const wh = loadPersistedPrefs()?.workingHours;
    expect(wh?.start).toBe(9);
    expect(wh?.end).toBe(17);
  });

  it('falls back to default workingHours when end <= start', () => {
    set({ workingHours: { start: 10, end: 5, days: [1, 2] } });
    expect(loadPersistedPrefs()?.workingHours.start).toBe(9);
  });

  it('falls back to default workingHours when days is not an array', () => {
    set({ workingHours: { start: 9, end: 17, days: 'monday' } });
    expect(loadPersistedPrefs()?.workingHours.days).toEqual([1, 2, 3, 4, 5]);
  });

  it('falls back to default workingHours when a day is out of range', () => {
    set({ workingHours: { start: 9, end: 17, days: [0, 7] } });
    expect(loadPersistedPrefs()?.workingHours.days).toEqual([1, 2, 3, 4, 5]);
  });
});

import { describe, expect, it } from 'vitest';
import { MAX_OVERRIDES_BYTES, WEEK_SLOTS } from '@/lib/rooms/config';
import {
  blobDow,
  blobDowToLuxonWeekday,
  emptyWeek,
  parseDay,
  parseWeek,
  serializeDay,
  serializeWeek,
  type SlotState,
  validateOverrides,
} from '@/lib/rooms/blob';

const STATES: SlotState[] = ['n', 'y', 's'];

function randomWeek(): string {
  let s = '';
  for (let i = 0; i < WEEK_SLOTS; i++) {
    s += STATES[Math.floor(Math.random() * 3)];
  }
  return s;
}

describe('parseWeek / serializeWeek', () => {
  it('are exact inverses for random valid blobs', () => {
    for (let i = 0; i < 200; i++) {
      const blob = randomWeek();
      expect(serializeWeek(parseWeek(blob))).toBe(blob);
    }
  });

  it('parseWeek throws on wrong length', () => {
    expect(() => parseWeek('nys')).toThrow();
    expect(() => parseWeek('n'.repeat(335))).toThrow();
    expect(() => parseWeek('n'.repeat(337))).toThrow();
  });

  it('parseWeek throws on an illegal character', () => {
    const bad = `${'n'.repeat(335)}x`;
    expect(() => parseWeek(bad)).toThrow();
  });

  it('serializeWeek throws on wrong slot count', () => {
    expect(() => serializeWeek(['n', 'y'])).toThrow();
  });
});

describe('parseDay / serializeDay', () => {
  it('round-trip a 48-char day', () => {
    const day = `${'y'.repeat(24)}${'n'.repeat(24)}`;
    expect(serializeDay(parseDay(day))).toBe(day);
  });

  it('parseDay throws on length ≠ 48 and on illegal chars', () => {
    expect(() => parseDay('n'.repeat(47))).toThrow();
    expect(() => parseDay(`${'n'.repeat(47)}z`)).toThrow();
  });
});

describe('emptyWeek', () => {
  it('is 336 `n`s', () => {
    const e = emptyWeek();
    expect(e).toHaveLength(WEEK_SLOTS);
    expect(/^n+$/.test(e)).toBe(true);
  });
});

describe('validateOverrides', () => {
  it('accepts a well-formed map', () => {
    const day = 'n'.repeat(48);
    const map = { '2026-06-17': day, '2026-12-31': day };
    expect(validateOverrides(map)).toEqual(map);
  });

  it('rejects an unreal date key', () => {
    expect(() => validateOverrides({ '2026-13-40': 'n'.repeat(48) })).toThrow();
    expect(() => validateOverrides({ '2026-02-30': 'n'.repeat(48) })).toThrow();
  });

  it('rejects a wrong-length value', () => {
    expect(() => validateOverrides({ '2026-06-17': 'n'.repeat(47) })).toThrow();
  });

  it('rejects a payload over the size cap', () => {
    const day = 'y'.repeat(48);
    const map: Record<string, string> = {};
    // A full year of distinct valid dates (~60 bytes each) blows past the 8 KiB cap.
    for (let m = 1; m <= 12; m++) {
      for (let d = 1; d <= 28; d++) {
        map[`2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`] = day;
      }
    }
    expect(JSON.stringify(map).length).toBeGreaterThan(MAX_OVERRIDES_BYTES);
    expect(() => validateOverrides(map)).toThrow();
  });

  it('rejects non-object input', () => {
    expect(() => validateOverrides(null)).toThrow();
    expect(() => validateOverrides([])).toThrow();
    expect(() => validateOverrides('nope')).toThrow();
  });
});

describe('blobDow weekday convention', () => {
  it('maps Luxon weekday (Mon=1..Sun=7) to blob index (Mon=0..Sun=6) and back', () => {
    for (let wd = 1; wd <= 7; wd++) {
      const idx = blobDow(wd);
      expect(idx).toBe(wd - 1);
      expect(blobDowToLuxonWeekday(idx)).toBe(wd);
    }
  });

  it('throws on out-of-range input', () => {
    expect(() => blobDow(0)).toThrow();
    expect(() => blobDow(8)).toThrow();
    expect(() => blobDowToLuxonWeekday(7)).toThrow();
    expect(() => blobDowToLuxonWeekday(-1)).toThrow();
  });
});

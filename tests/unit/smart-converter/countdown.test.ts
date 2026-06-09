import { breakdown, relativePhrase } from '@/lib/smart-converter/countdown';
import { describe, expect, it } from 'vitest';

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('breakdown', () => {
  it('splits a future delta into d/h/m/s', () => {
    expect(breakdown(3 * DAY + 4 * HOUR + 5 * MIN + 6 * SEC)).toEqual({
      past: false,
      d: 3,
      h: 4,
      m: 5,
      s: 6,
    });
  });

  it('flags past deltas and reports magnitudes', () => {
    const parts = breakdown(-(2 * HOUR + 30 * MIN));
    expect(parts.past).toBe(true);
    expect(parts).toMatchObject({ d: 0, h: 2, m: 30 });
  });
});

describe('relativePhrase', () => {
  it('leads with the coarsest unit', () => {
    expect(relativePhrase(breakdown(20 * DAY))).toBe('in 20 days');
    expect(relativePhrase(breakdown(1 * DAY))).toBe('in 1 day');
    expect(relativePhrase(breakdown(4 * HOUR))).toBe('in 4 hours');
    expect(relativePhrase(breakdown(12 * MIN))).toBe('in 12 min');
  });

  it('reads "ago" for past events (rule 5)', () => {
    expect(relativePhrase(breakdown(-(2 * HOUR)))).toBe('2 hours ago');
  });
});

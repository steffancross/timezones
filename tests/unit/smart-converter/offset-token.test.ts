import { parseOffsetToken } from '@/lib/smart-converter/offset-token';
import { describe, expect, it } from 'vitest';

describe('parseOffsetToken', () => {
  it('parses whole-hour GMT/UTC offsets', () => {
    expect(parseOffsetToken('GMT+8')?.minutes).toBe(480);
    expect(parseOffsetToken('UTC-5')?.minutes).toBe(-300);
    expect(parseOffsetToken('gmt+0')?.minutes).toBe(0);
  });

  it('parses the typographic minus', () => {
    expect(parseOffsetToken('UTC−5')?.minutes).toBe(-300);
  });

  it('parses half- and quarter-hour offsets', () => {
    expect(parseOffsetToken('GMT+5:30')?.minutes).toBe(330);
    expect(parseOffsetToken('GMT-0930')?.minutes).toBe(-570);
    expect(parseOffsetToken('GMT+5:45')?.minutes).toBe(345);
  });

  it('parses bare signed offsets', () => {
    expect(parseOffsetToken('+08:00')?.minutes).toBe(480);
    expect(parseOffsetToken('-05:00')?.minutes).toBe(-300);
  });

  it('rejects non-offsets and out-of-range values', () => {
    expect(parseOffsetToken('EST')).toBeNull();
    expect(parseOffsetToken('8pm')).toBeNull();
    expect(parseOffsetToken('GMT+20')).toBeNull();
    expect(parseOffsetToken('')).toBeNull();
  });
});

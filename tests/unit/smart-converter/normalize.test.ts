import { normalize } from '@/lib/smart-converter/normalize';
import { describe, expect, it } from 'vitest';

describe('normalize', () => {
  it('preserves length (the highlight-index invariant)', () => {
    const inputs = [
      'preorders start april 29 20:00 (gmt + 8) 2026',
      '🎮 Preorders go live June 29 at 8:00 PM (GMT+8). Worldwide release July 14, 9:00 PM (GMT+8). 🚀',
      'Pop-up runs Sep 24–27 (GMT+8).',
      'drops 3pm EST friday ✨',
      'utc -  5:30 deadline',
    ];
    for (const input of inputs) {
      expect(normalize(input).length).toBe(input.length);
    }
  });

  it('collapses spaced offsets into a canonical token', () => {
    expect(normalize('gmt + 8').includes('GMT+8')).toBe(true);
    expect(normalize('utc - 5').includes('UTC-5')).toBe(true);
    expect(normalize('GMT −  0930').includes('GMT-0930')).toBe(true);
  });

  it('leaves already-clean offsets intact', () => {
    expect(normalize('at 8pm GMT+8 today')).toBe('at 8pm GMT+8 today');
  });

  it('strips emoji to spaces but keeps surrounding text', () => {
    const out = normalize('🎮 drops at 8pm');
    expect(out).toContain('drops at 8pm');
    expect(out).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('converts en/em-dashes to hyphens (so chrono detects ranges)', () => {
    expect(normalize('Sep 24–27')).toBe('Sep 24-27');
    expect(normalize('Mon—Fri')).toBe('Mon-Fri');
  });
});

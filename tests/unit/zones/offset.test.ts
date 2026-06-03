import { describe, expect, it } from 'vitest';
import { formatUtcOffset } from '@/lib/zones/offset';

describe('formatUtcOffset', () => {
  it('renders zero as UTC±0', () => {
    expect(formatUtcOffset(0)).toBe('UTC±0');
  });

  it('renders positive and negative whole-hour offsets', () => {
    expect(formatUtcOffset(60)).toBe('UTC+1');
    expect(formatUtcOffset(480)).toBe('UTC+8');
    expect(formatUtcOffset(-480)).toBe('UTC−8');
    expect(formatUtcOffset(840)).toBe('UTC+14');
    expect(formatUtcOffset(-720)).toBe('UTC−12');
  });

  it('renders half-hour offsets with zero-padded minutes', () => {
    expect(formatUtcOffset(330)).toBe('UTC+5:30'); // India
    expect(formatUtcOffset(-210)).toBe('UTC−3:30'); // Newfoundland
    expect(formatUtcOffset(-570)).toBe('UTC−9:30'); // Marquesas
  });

  it('renders the quarter-hour offset', () => {
    expect(formatUtcOffset(345)).toBe('UTC+5:45'); // Nepal
  });

  it('uses the typographic minus (U+2212), not a hyphen-minus', () => {
    expect(formatUtcOffset(-480)).toContain('−');
    expect(formatUtcOffset(-480)).not.toContain('-');
  });
});

import { normalize } from '@/lib/smart-converter/normalize';
import { extract } from '@/lib/smart-converter/parse';
import { describe, expect, it } from 'vitest';

// Fixed reference so forwardDate/relative cases are deterministic: Mon Jun 8 2026.
const REF = new Date(Date.UTC(2026, 5, 8, 16, 0, 0));
const run = (s: string) => extract(normalize(s), REF);

describe('extract', () => {
  it('pulls multiple events from one block, each with its zone token', () => {
    const m = run(
      '🎮 Preorders go live June 29 at 8:00 PM (GMT+8). Worldwide release July 14, 9:00 PM (GMT+8).',
    );
    expect(m).toHaveLength(2);
    expect(m[0]?.start).toMatchObject({ month: 6, day: 29, hour: 20 });
    expect(m[1]?.start).toMatchObject({ month: 7, day: 14, hour: 21 });
    expect(m[0]?.rawZoneToken).toBe('GMT+8');
    expect(m[1]?.rawZoneToken).toBe('GMT+8');
  });

  it('detects a range and leaves a clean closing endpoint', () => {
    const m = run('Pop-up runs Sep 24–27 (GMT+8).');
    expect(m[0]?.hasRange).toBe(true);
    expect(m[0]?.start.day).toBe(24);
    expect(m[0]?.end?.day).toBe(27);
  });

  it('keeps a relative reference and its trailing abbreviation (rule 2)', () => {
    const m = run('next friday 8pm EST');
    expect(m[0]?.start).toMatchObject({ month: 6, day: 19, hour: 20 });
    expect(m[0]?.start.timeImplied).toBe(false);
    expect(m[0]?.rawZoneToken).toBe('EST');
  });

  it('flags a date with no clock time', () => {
    const m = run('drops April 29');
    expect(m[0]?.start.timeImplied).toBe(true);
    expect(m[0]?.start).toMatchObject({ month: 4, day: 29 });
  });

  it('recovers a "<place> time" phrase sitting outside the match', () => {
    const m = run('15:00 Beijing time');
    expect(m[0]?.rawZoneToken?.toLowerCase()).toBe('beijing time');
  });
});

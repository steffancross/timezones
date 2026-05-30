import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { currentAbbreviation, standardAbbreviation } from '@/lib/zones/abbreviation';

// Northern-hemisphere winter (standard time) vs summer (DST active). For the
// Southern Hemisphere the seasons — and thus DST state — are flipped, which is
// exactly what makes Auckland a good test of DST-awareness.
const JAN = DateTime.fromObject({ year: 2024, month: 1, day: 15, hour: 12 }, { zone: 'UTC' });
const JUL = DateTime.fromObject({ year: 2024, month: 7, day: 15, hour: 12 }, { zone: 'UTC' });

describe('currentAbbreviation', () => {
  it('Auckland is NZDT in January (southern summer) and NZST in July (winter)', () => {
    expect(currentAbbreviation('Pacific/Auckland', JAN)).toBe('NZDT');
    expect(currentAbbreviation('Pacific/Auckland', JUL)).toBe('NZST');
  });

  it('London is GMT in January and BST in July', () => {
    expect(currentAbbreviation('Europe/London', JAN)).toBe('GMT');
    expect(currentAbbreviation('Europe/London', JUL)).toBe('BST');
  });

  it('New York is EST in January and EDT in July', () => {
    expect(currentAbbreviation('America/New_York', JAN)).toBe('EST');
    expect(currentAbbreviation('America/New_York', JUL)).toBe('EDT');
  });

  it('a non-DST zone keeps its single abbreviation year-round', () => {
    expect(currentAbbreviation('Pacific/Honolulu', JAN)).toBe('HST');
    expect(currentAbbreviation('Pacific/Honolulu', JUL)).toBe('HST');
  });

  it('falls back to the runtime short name for a zone not in the curated table', () => {
    // Pacific/Chatham is intentionally absent from data/zones.ts, so this
    // exercises the getZoneByIana === null branch. The runtime has no real
    // abbreviation for it, so it yields the "GMT±N" offset form.
    const iana = 'Pacific/Chatham';
    expect(currentAbbreviation(iana, JAN)).toBe(JAN.setZone(iana).toFormat('ZZZZ'));
  });
});

describe('standardAbbreviation', () => {
  it('returns the canonical standard form regardless of season', () => {
    // DST-agnostic: always the [0] entry for curated zones. Used for stable
    // directory labels where a value that flips with the season reads worse.
    expect(standardAbbreviation('Europe/London')).toBe('GMT');
    expect(standardAbbreviation('Pacific/Auckland')).toBe('NZST');
    expect(standardAbbreviation('America/New_York')).toBe('EST');
  });
});

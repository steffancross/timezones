import { describe, expect, it } from 'vitest';
import { pickContextualZones } from '@/lib/zones/contextual';

describe('pickContextualZones', () => {
  it('returns the global fallback when both inputs are null', () => {
    expect(pickContextualZones(null, null)).toEqual([
      'America/New_York',
      'Europe/London',
      'Asia/Tokyo',
    ]);
  });

  it('returns country defaults when only country is known', () => {
    expect(pickContextualZones(null, 'US')).toEqual([
      'America/Los_Angeles',
      'America/New_York',
      'Europe/London',
    ]);
    expect(pickContextualZones(null, 'JP')).toEqual([
      'Asia/Tokyo',
      'America/Los_Angeles',
      'Europe/London',
    ]);
  });

  it('falls back globally when the country is unmapped', () => {
    expect(pickContextualZones(null, 'ZZ')).toEqual([
      'America/New_York',
      'Europe/London',
      'Asia/Tokyo',
    ]);
  });

  it('leads with the detected zone when present and not UTC', () => {
    const result = pickContextualZones('Asia/Tokyo', 'US');
    expect(result[0]).toBe('Asia/Tokyo');
    expect(result).toHaveLength(3);
  });

  it('treats `UTC` as no-detection (fallback to country defaults)', () => {
    // A visitor with UTC detection is almost always a VPN/fallback case, not a
    // real UTC resident. The function should treat this as "no detection" and
    // use country defaults instead of leading with UTC.
    const result = pickContextualZones('UTC', 'US');
    expect(result).toEqual(['America/Los_Angeles', 'America/New_York', 'Europe/London']);
  });

  it('filters the detected zone out of the secondary list (no duplicate lead)', () => {
    // If a US visitor's detection IS Los Angeles, we shouldn't have it appear
    // both as `detected` (position 0) and again in the secondaries.
    const result = pickContextualZones('America/Los_Angeles', 'US');
    expect(result).toEqual(['America/Los_Angeles', 'America/New_York', 'Europe/London']);
    // Count occurrences of LA — must be exactly 1.
    expect(result.filter((z) => z === 'America/Los_Angeles')).toHaveLength(1);
  });

  it('uses global fallback as secondaries when country is null but detection is present', () => {
    const result = pickContextualZones('Australia/Sydney', null);
    expect(result[0]).toBe('Australia/Sydney');
    // The rest should come from FALLBACK, minus any duplicate of Sydney.
    expect(result.slice(1)).toEqual(['America/New_York', 'Europe/London']);
  });

  it('always returns exactly 3 zones', () => {
    expect(pickContextualZones(null, null)).toHaveLength(3);
    expect(pickContextualZones(null, 'US')).toHaveLength(3);
    expect(pickContextualZones('Asia/Tokyo', null)).toHaveLength(3);
    expect(pickContextualZones('Asia/Tokyo', 'US')).toHaveLength(3);
  });
});

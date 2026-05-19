import { describe, expect, it } from 'vitest';
import {
  getCitiesByIana,
  getCityByIata,
  getCityById,
  getDisambiguation,
} from '@/lib/cities/resolve';

describe('cities resolve', () => {
  it('looks up a city by id', () => {
    const c = getCityById('tokyo');
    expect(c?.iana).toBe('Asia/Tokyo');
  });

  it('returns null for unknown id', () => {
    expect(getCityById('not-a-city')).toBeNull();
  });

  it('returns all cities in an IANA zone', () => {
    const tokyoZone = getCitiesByIana('Asia/Tokyo');
    expect(tokyoZone.length).toBeGreaterThan(0);
    expect(tokyoZone.some((c) => c.id === 'tokyo')).toBe(true);
  });

  it('resolves JFK to New York', () => {
    const c = getCityByIata('JFK');
    expect(c?.iana).toBe('America/New_York');
    // Top match should be the largest NYC entry (tier 1).
    expect(c?.tier).toBeLessThanOrEqual(1);
  });

  it('returns disambiguation for collisions in the dataset', () => {
    // The disambiguation set is data-driven; we don't assert a specific slug
    // beyond "at least one bare slug expands to multiple qualified slugs".
    const sanJose = getDisambiguation('san-jose');
    expect(sanJose).not.toBeNull();
    expect(sanJose?.length).toBeGreaterThan(1);
  });

  it('returns null for non-disambiguation slugs', () => {
    expect(getDisambiguation('tokyo')).toBeNull();
  });
});

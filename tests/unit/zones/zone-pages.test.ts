import { describe, expect, it } from 'vitest';
import { getAllZoneSlugs } from '@/data/zones';
import { getZoneDescription } from '@/lib/zones/descriptions';
import { getCitiesForZone } from '@/lib/zones/resolve';

describe('getCitiesForZone', () => {
  it('spans every IANA that maps to the curated zone, not just the canonical one', () => {
    const ids = getCitiesForZone('pst').map((c) => c.id);
    // Los Angeles is the canonical IANA; Vancouver (America/Vancouver) and
    // Tijuana (America/Tijuana) are member IANAs that getCitiesByIana would miss.
    expect(ids).toContain('los-angeles');
    expect(ids).toContain('vancouver');
    expect(ids).toContain('tijuana');
  });

  it('returns cities sorted most-populous first', () => {
    const cities = getCitiesForZone('pst');
    const pops = cities.map((c) => c.population);
    expect(pops).toEqual([...pops].sort((a, b) => b - a));
  });

  it('returns an empty array for an unknown zone id', () => {
    expect(getCitiesForZone('not-a-zone')).toEqual([]);
  });

  it('covers every curated zone slug without throwing', () => {
    for (const id of getAllZoneSlugs()) {
      expect(Array.isArray(getCitiesForZone(id))).toBe(true);
    }
  });
});

describe('getZoneDescription', () => {
  it('returns null for an unknown zone id', () => {
    expect(getZoneDescription('not-a-zone')).toBeNull();
  });
});

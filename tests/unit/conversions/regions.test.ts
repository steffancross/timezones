import { describe, expect, it } from 'vitest';
import { regionForCountry, regionForZone } from '@/lib/conversions/regions';

describe('regionForCountry', () => {
  it.each([
    ['US', 'Americas'],
    ['BR', 'Americas'],
    ['GB', 'Europe'],
    ['DE', 'Europe'],
    ['EG', 'Africa'],
    ['ZA', 'Africa'],
    ['JP', 'Asia'],
    ['CN', 'Asia'],
    ['AE', 'Asia'],
    ['AU', 'Oceania'],
    ['NZ', 'Oceania'],
  ])('maps %s → %s', (cc, region) => {
    expect(regionForCountry(cc)).toBe(region);
  });

  it('is case-insensitive', () => {
    expect(regionForCountry('us')).toBe('Americas');
  });

  it('falls back to Global for unknown codes', () => {
    expect(regionForCountry('ZZ')).toBe('Global');
  });
});

describe('regionForZone', () => {
  it('folds North America and South America into Americas', () => {
    expect(regionForZone({ region: 'North America' })).toBe('Americas');
    expect(regionForZone({ region: 'South America' })).toBe('Americas');
  });

  it('folds Middle East into Asia', () => {
    expect(regionForZone({ region: 'Middle East' })).toBe('Asia');
  });

  it('keeps Global as Global (matches every filter)', () => {
    expect(regionForZone({ region: 'Global' })).toBe('Global');
  });
});

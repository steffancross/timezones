import { describe, expect, it } from 'vitest';
import { greatCircleMiles, roundMiles } from '@/lib/geo/distance';

describe('greatCircleMiles', () => {
  it('returns 0 for the same point', () => {
    expect(greatCircleMiles(40, -74, 40, -74)).toBeCloseTo(0, 6);
  });

  it('matches a known city-to-city distance (LA → NYC)', () => {
    // NYC (40.7128, -74.0060) ↔ LA (34.0522, -118.2437) is ~2451 miles
    // via standard haversine. ±5 mi tolerance for floating-point + Earth radius
    // approximation.
    const d = greatCircleMiles(40.7128, -74.006, 34.0522, -118.2437);
    expect(d).toBeGreaterThan(2440);
    expect(d).toBeLessThan(2460);
  });

  it('matches another known pair (London → Tokyo)', () => {
    // ~5950 miles.
    const d = greatCircleMiles(51.5074, -0.1278, 35.6895, 139.6917);
    expect(d).toBeGreaterThan(5930);
    expect(d).toBeLessThan(5980);
  });

  it('is symmetric: A→B equals B→A', () => {
    const ab = greatCircleMiles(35.6895, 139.6917, -33.8688, 151.2093);
    const ba = greatCircleMiles(-33.8688, 151.2093, 35.6895, 139.6917);
    expect(ab).toBeCloseTo(ba, 6);
  });

  it('returns roughly half-circumference for antipodal points', () => {
    // Earth mean circumference ~24,901 mi → half ~12,450 mi.
    const d = greatCircleMiles(0, 0, 0, 180);
    expect(d).toBeGreaterThan(12_400);
    expect(d).toBeLessThan(12_500);
  });
});

describe('roundMiles', () => {
  it('rounds <100 to nearest 5', () => {
    expect(roundMiles(0)).toBe(0);
    expect(roundMiles(7)).toBe(5);
    expect(roundMiles(13)).toBe(15);
    expect(roundMiles(97)).toBe(95);
  });

  it('rounds 100-999 to nearest 25', () => {
    expect(roundMiles(100)).toBe(100);
    expect(roundMiles(113)).toBe(125); // 113/25 = 4.52 → 5*25 = 125
    expect(roundMiles(487)).toBe(475);
    expect(roundMiles(999)).toBe(1000);
  });

  it('rounds 1000+ to nearest 50', () => {
    expect(roundMiles(1000)).toBe(1000);
    expect(roundMiles(2451)).toBe(2450);
    expect(roundMiles(2476)).toBe(2500);
    expect(roundMiles(12_450)).toBe(12_450);
  });
});

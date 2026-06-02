/**
 * Great-circle distance between two lat/lng points, in statute miles.
 * Standard haversine formula. Earth radius: 3958.8 mi (mean).
 */
export function greatCircleMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Round a mileage to a tidy display value:
 *   < 100   → nearest 5
 *   100-999 → nearest 25
 *   1000+   → nearest 50
 */
export function roundMiles(mi: number): number {
  if (mi < 100) return Math.round(mi / 5) * 5;
  if (mi < 1000) return Math.round(mi / 25) * 25;
  return Math.round(mi / 50) * 50;
}

/**
 * Initial great-circle bearing from point 1 to point 2, in degrees clockwise
 * from true north (0 = north, 90 = east, 180 = south, 270 = west).
 */
export function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

const COMPASS_8 = [
  'north',
  'northeast',
  'east',
  'southeast',
  'south',
  'southwest',
  'west',
  'northwest',
] as const;

/** Map a bearing in degrees to an 8-point compass word ('north', 'northeast', …). */
export function cardinalDirection(deg: number): (typeof COMPASS_8)[number] {
  const idx = Math.round(((deg % 360) + 360) / 45) % 8;
  return COMPASS_8[idx] ?? 'north';
}

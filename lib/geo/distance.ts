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

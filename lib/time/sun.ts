import { DateTime } from 'luxon';
import SunCalc from 'suncalc';

export interface SunTimes {
  /** Sunrise as DateTime in the zone's local time */
  sunrise: DateTime;
  /** Sunset as DateTime in the zone's local time */
  sunset: DateTime;
  /** Day length in minutes */
  dayLengthMinutes: number;
  /** True if the result came from the fixed fallback rather than astronomical computation */
  isFallback: boolean;
}

/**
 * Cache keyed by `${iana}:${isoDate}:${lat}:${lng}` rounded to 2 decimals
 * (~1km precision). Cache size stays small since we only compute for visible zones.
 */
const sunCache = new Map<string, SunTimes>();

/**
 * Get sunrise/sunset times for a location on a specific date.
 */
export function getSunTimes(iana: string, isoDate: string, lat: number, lng: number): SunTimes {
  const cacheKey = `${iana}:${isoDate}:${lat.toFixed(2)}:${lng.toFixed(2)}`;
  const cached = sunCache.get(cacheKey);
  if (cached) return cached;

  const result = compute(iana, isoDate, lat, lng);
  sunCache.set(cacheKey, result);
  return result;
}

function compute(iana: string, isoDate: string, lat: number, lng: number): SunTimes {
  // Use local noon in the target zone as the reference instant so SunCalc
  // returns sun events for the correct local day.
  const localNoon = DateTime.fromISO(isoDate, { zone: iana }).set({ hour: 12, minute: 0 });
  const ref = localNoon.toJSDate();

  let sunCalcResult: ReturnType<typeof SunCalc.getTimes>;
  try {
    sunCalcResult = SunCalc.getTimes(ref, lat, lng);
  } catch {
    return buildFallback(isoDate, iana);
  }

  const sunrise = DateTime.fromJSDate(sunCalcResult.sunrise).setZone(iana);
  const sunset = DateTime.fromJSDate(sunCalcResult.sunset).setZone(iana);

  if (!sunrise.isValid || !sunset.isValid) {
    return buildPolarFallback(isoDate, iana, lat);
  }

  const dayLengthMinutes = Math.round(sunset.diff(sunrise, 'minutes').minutes);

  return {
    sunrise,
    sunset,
    dayLengthMinutes,
    isFallback: false,
  };
}

function buildFallback(isoDate: string, iana: string): SunTimes {
  const sunrise = DateTime.fromISO(isoDate, { zone: iana }).set({ hour: 6 });
  const sunset = DateTime.fromISO(isoDate, { zone: iana }).set({ hour: 18 });
  return {
    sunrise,
    sunset,
    dayLengthMinutes: 720,
    isFallback: true,
  };
}

function buildPolarFallback(isoDate: string, iana: string, lat: number): SunTimes {
  const date = DateTime.fromISO(isoDate);
  const month = date.month;
  const isNorthernSummer = month >= 4 && month <= 9;
  const continuousDaylight = (lat > 0 && isNorthernSummer) || (lat < 0 && !isNorthernSummer);

  if (continuousDaylight) {
    return {
      sunrise: DateTime.fromISO(isoDate, { zone: iana }).set({ hour: 0 }),
      sunset: DateTime.fromISO(isoDate, { zone: iana }).set({ hour: 23, minute: 59 }),
      dayLengthMinutes: 1440,
      isFallback: true,
    };
  }

  return {
    sunrise: DateTime.fromISO(isoDate, { zone: iana }).set({ hour: 0 }),
    sunset: DateTime.fromISO(isoDate, { zone: iana }).set({ hour: 0 }),
    dayLengthMinutes: 0,
    isFallback: true,
  };
}

/**
 * Returns an array of hour numbers (0-23) that fall within "night" for a given
 * location/date. Used by F1 to determine which tiles to overlay.
 *
 * Night = hours before sunrise OR after sunset on this local date. Does NOT
 * cross midnight to the next day — by design, the overlay paints from the
 * start of the strip until sunrise and from sunset until end.
 */
export function getNightHours(iana: string, isoDate: string, lat: number, lng: number): number[] {
  const sun = getSunTimes(iana, isoDate, lat, lng);
  if (sun.dayLengthMinutes >= 1440) return [];
  if (sun.dayLengthMinutes <= 0) return Array.from({ length: 24 }, (_, h) => h);

  const { sunrise, sunset } = sun;
  const nightHours: number[] = [];

  for (let h = 0; h < 24; h++) {
    const isBeforeSunrise = h < sunrise.hour;
    const isAfterSunset = h >= sunset.hour;
    if (isBeforeSunrise || isAfterSunset) {
      nightHours.push(h);
    }
  }

  return nightHours;
}

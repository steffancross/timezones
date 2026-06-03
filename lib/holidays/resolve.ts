import holidaysData from '@/data/holidays.json';

export interface Holiday {
  /** ISO yyyy-mm-dd. */
  date: string;
  /** English name. */
  name: string;
  /** Name in the country's own language. */
  localName: string;
}

interface HolidaysFile {
  year: number;
  holidays: Record<string, Holiday[]>;
}

const data = holidaysData as HolidaysFile;

/** The calendar year the committed holiday data covers (for display labels). */
export const HOLIDAYS_YEAR = data.year;

/**
 * Public holidays for a country (ISO 3166-1 alpha-2), or an empty array if we
 * have no data for it. Sorted by date. National holidays only — see the build
 * script (scripts/build-cities/04-fetch-holidays.ts).
 */
export function getHolidays(countryCode: string | null | undefined): Holiday[] {
  if (!countryCode) return [];
  return data.holidays[countryCode.toUpperCase()] ?? [];
}

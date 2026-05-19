/**
 * Weekend days expressed in Luxon's weekday convention (Monday = 1, Sunday = 7).
 * For v1: globally Saturday (6) + Sunday (7), no regional variation.
 *
 * To add regional weekend support in v2:
 *   - Replace WEEKEND_DAYS with a Record<countryCode, number[]> lookup
 *   - Update the weekend overlay (F3) to take a country code and look up days
 *   - Common variants to add later:
 *     - Sat-Sun (default, most of world)
 *     - Fri-Sat (Saudi Arabia, Israel, Egypt, others — see Gulf states)
 *     - Thu-Fri (Iran)
 *
 * Defined here to make the v2 extension a single-file change rather than
 * scattered conditionals throughout the codebase.
 */
export const WEEKEND_DAYS: ReadonlySet<number> = new Set([6, 7]);

/**
 * Check if a weekday is the weekend.
 * @param weekday 1-7 (Luxon convention: Monday = 1, Sunday = 7)
 */
export function isWeekend(weekday: number): boolean {
  return WEEKEND_DAYS.has(weekday);
}

/**
 * Get the weekend day numbers as an array (useful for filter operations).
 */
export function getWeekendDays(): number[] {
  return Array.from(WEEKEND_DAYS);
}

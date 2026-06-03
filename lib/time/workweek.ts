/**
 * Countries whose standard working week is NOT Monday–Friday. Used to add a
 * scheduling caveat on pair pages — the 9–5 overlap math itself stays Mon–Fri
 * (visitors can adjust hours/days in the converter); this only annotates the
 * pages where that default is regionally wrong.
 *
 * Scope is deliberately limited to the stable Sunday–Thursday / Friday–Saturday
 * group (Gulf states, Levant, parts of North Africa, Israel). Countries with
 * contested or recently-changed weekends (e.g. the UAE moved to a Sat–Sun
 * weekend in 2022) are left out rather than risk a stale claim.
 *
 * Keyed by ISO 3166-1 alpha-2 country code.
 */
export interface WorkweekPattern {
  /** Working days, human-readable (e.g. 'Sunday–Thursday'). */
  workweek: string;
  /** Weekend days, human-readable (e.g. 'Friday–Saturday'). */
  weekend: string;
}

const SUN_THU: WorkweekPattern = { workweek: 'Sunday–Thursday', weekend: 'Friday–Saturday' };

const NON_STANDARD_WORKWEEK: Record<string, WorkweekPattern> = {
  SA: SUN_THU, // Saudi Arabia
  KW: SUN_THU, // Kuwait
  QA: SUN_THU, // Qatar
  BH: SUN_THU, // Bahrain
  OM: SUN_THU, // Oman
  EG: SUN_THU, // Egypt
  JO: SUN_THU, // Jordan
  IQ: SUN_THU, // Iraq
  YE: SUN_THU, // Yemen
  LY: SUN_THU, // Libya
  SD: SUN_THU, // Sudan
  PS: SUN_THU, // Palestine
  DJ: SUN_THU, // Djibouti
  IL: SUN_THU, // Israel (Friday often a half day)
};

/** Return the non-standard workweek pattern for a country code, or null if it runs Mon–Fri. */
export function getNonStandardWorkweek(
  countryCode: string | null | undefined,
): WorkweekPattern | null {
  if (!countryCode) return null;
  return NON_STANDARD_WORKWEEK[countryCode.toUpperCase()] ?? null;
}

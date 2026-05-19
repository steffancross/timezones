export interface Zone {
  /** URL slug, lowercase, hyphenated. e.g., 'pst' */
  id: string;

  /** Canonical IANA zone. e.g., 'America/Los_Angeles' */
  iana: string;

  /** All abbreviations this zone uses (standard + daylight). e.g., ['PST', 'PDT'] */
  abbreviations: string[];

  /** Short display name. e.g., 'Pacific Time' */
  display_name: string;

  /** Long display name. e.g., 'Pacific Standard Time / Pacific Daylight Time' */
  display_name_long: string;

  /** Region grouping for UI. */
  region:
    | 'North America'
    | 'Europe'
    | 'Asia'
    | 'Middle East'
    | 'Oceania'
    | 'South America'
    | 'Africa'
    | 'Global';

  /** ISO 3166-1 alpha-2 country codes where this zone is primarily used */
  countries: string[];

  observes_dst: boolean;

  /** Winter offset in minutes from UTC */
  utc_offset_std: number;

  /** Summer offset in minutes from UTC. null if no DST */
  utc_offset_dst: number | null;

  /** Search aliases — natural-language variants users might type */
  search_aliases: string[];

  /** 0-100 popularity ranking for search results and pair-page priority */
  popularity: number;

  /** Representative latitude (primary city of the zone) — used by suncalc in C9. */
  lat: number;

  /** Representative longitude (primary city of the zone) — used by suncalc in C9. */
  lng: number;

  /** Present if abbreviation collides with another zone. e.g., 'cst' for both Central and China Standard Time */
  collision_group?: string;

  /** True if this is the default interpretation when the abbreviation is ambiguous */
  is_canonical_for_collision?: boolean;
}

export interface City {
  /** URL slug, lowercase, hyphenated, globally unique. e.g., 'new-york' or 'paris-texas' */
  id: string;

  /** Display name. e.g., 'New York' */
  name: string;

  /** ASCII version for search normalization. e.g., 'Zurich' (vs 'Zürich') */
  ascii_name: string;

  /** Country full name. e.g., 'United States' */
  country: string;

  /** ISO 3166-1 alpha-2. e.g., 'US' */
  country_code: string;

  /** State/province for disambiguation. Optional. */
  admin1?: string;

  /** IANA zone. e.g., 'America/New_York' */
  iana: string;

  lat: number;
  lng: number;
  population: number;

  /** Tier 1-3 for pair-page generation priority */
  tier: 1 | 2 | 3;

  /** Alternate names users might search. English/Latin script only + curated transliterations */
  alt_names: string[];

  /** IATA airport codes serving this city. e.g., ['JFK', 'LGA', 'EWR'] */
  iata_codes: string[];

  /** 0-100, derived from population + curation */
  popularity: number;
}

/** Intermediate type during build, before tiering and disambiguation */
export interface RawCity {
  geonameid: number;
  name: string;
  ascii_name: string;
  alt_names_raw: string;
  lat: number;
  lng: number;
  feature_class: string;
  feature_code: string;
  country_code: string;
  admin1_code: string;
  population: number;
  iana: string;
}

export interface RawAirport {
  icao: string;
  iata: string | null;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  tz: string;
}

export interface EnrichedCity extends RawCity {
  iata_codes: string[];
}

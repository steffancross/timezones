import type { Options } from 'minisearch';

export const SEARCH_FIELDS = [
  'name',
  'abbreviations',
  'iata',
  'alt_names',
  'country',
  'country_code',
  'region',
] as const;

export const STORE_FIELDS = [
  'type',
  'display_name',
  'display_secondary',
  'slug',
  'iana',
  'popularity',
] as const;

export const SEARCH_CONFIG = {
  fields: SEARCH_FIELDS as unknown as string[],
  storeFields: STORE_FIELDS as unknown as string[],
  searchOptions: {
    boost: {
      abbreviations: 5,
      iata: 5,
      name: 3,
      alt_names: 2,
      country: 0.5,
      country_code: 1,
      region: 0.3,
    },
    fuzzy: 0.2,
    prefix: true,
    combineWith: 'AND',
  },
} satisfies Options;

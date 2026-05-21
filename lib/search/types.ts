export interface SearchDoc {
  /** Namespaced id: 'zone:pst' or 'city:tokyo' */
  id: string;
  type: 'zone' | 'city';

  /** Primary display label. e.g., 'Tokyo' or 'Pacific Time' */
  display_name: string;

  /** Secondary detail for disambiguation. e.g., 'Japan' or 'PST · UTC-8' */
  display_secondary: string;

  slug: string;
  iana: string;
  popularity: number;

  /** City tier (1 = major, 2 = significant, 3 = other). Undefined for zones. */
  tier?: 1 | 2 | 3;

  // ===== searchable fields =====
  name: string;
  alt_names: string;
  abbreviations: string;
  iata: string;
  country: string;
  country_code: string;
  region: string;
}

export interface SearchResult extends SearchDoc {
  score: number;
}

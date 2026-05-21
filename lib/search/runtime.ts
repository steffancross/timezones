'use client';

import type MiniSearchType from 'minisearch';
import type { AsPlainObject } from 'minisearch';
import { SEARCH_CONFIG } from './config';
import type { SearchDoc, SearchResult } from './types';

let cached: MiniSearchType<SearchDoc> | null = null;
let pending: Promise<MiniSearchType<SearchDoc>> | null = null;

/**
 * Lazy-load the MiniSearch library + serialized index from /search-index.json.
 * Module-level cache means a second caller after first load is a sync resolve.
 * Concurrent callers share the same in-flight promise.
 */
export function loadSearchIndex(): Promise<MiniSearchType<SearchDoc>> {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;

  pending = (async () => {
    try {
      const [{ default: MiniSearch }, indexData] = await Promise.all([
        import('minisearch'),
        fetch('/search-index.json').then((r) => {
          if (!r.ok) throw new Error(`Search index fetch failed: ${r.status}`);
          return r.json() as Promise<AsPlainObject>;
        }),
      ]);

      const ms = MiniSearch.loadJS<SearchDoc>(indexData, SEARCH_CONFIG);
      cached = ms;
      return ms;
    } finally {
      // Clear the pending promise on both success and failure so callers can
      // retry after a network error.
      pending = null;
    }
  })();

  return pending;
}

/**
 * Field boosts gated by query length. At 1-2 chars users are almost always
 * starting to type a name; matching against alt_names / iata / country there
 * creates noisy false positives (e.g., "LO" matching Lagos via IATA "LOS",
 * Luohe via alt "Lo-he", Luanda via "Loanda"). IATA only becomes intentional
 * at 3 chars (the code length); historical alt_names only become useful at
 * 4+ chars where they're unlikely to collide with common prefixes.
 */
function boostsForLength(len: number) {
  if (len <= 2) {
    return {
      name: 4,
      abbreviations: 5,
      iata: 0,
      alt_names: 0,
      country: 0,
      country_code: 0,
      region: 0,
    };
  }
  if (len === 3) {
    return {
      name: 4,
      abbreviations: 5,
      iata: 5,
      alt_names: 0.5,
      country: 0,
      country_code: 1,
      region: 0,
    };
  }
  return {
    name: 3,
    abbreviations: 5,
    iata: 5,
    alt_names: 2,
    country: 0.5,
    country_code: 1,
    region: 0.3,
  };
}

/**
 * Execute a search and return ranked results. Final ranking:
 *
 *   (msScore + popularity * 0.5) * prefixBonus
 *
 * - Length-gated boosts (above) suppress noisy alt_names / iata matches on
 *   short queries.
 * - The additive popularity term acts as a floor so high-pop cities (London,
 *   Los Angeles, Madrid) can't get buried under low-pop coincidences.
 * - prefixBonus = 1.5× when display_name starts with the query — guarantees
 *   "what I literally typed" beats "fuzzy match somewhere in alt_names".
 */
export async function searchAll(query: string, limit = 8): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const ms = await loadSearchIndex();
    const qLower = q.toLowerCase();
    const raw = ms.search(q, { boost: boostsForLength(q.length) });

    return raw
      .map((r) => {
        const popularity = typeof r.popularity === 'number' ? r.popularity : 0;
        const displayName = typeof r.display_name === 'string' ? r.display_name : '';
        const prefixBonus = displayName.toLowerCase().startsWith(qLower) ? 1.5 : 1;
        const finalScore = (r.score + popularity * 0.5) * prefixBonus;
        return { hit: r, finalScore };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit)
      .map(({ hit }) => hit as unknown as SearchResult);
  } catch {
    return [];
  }
}

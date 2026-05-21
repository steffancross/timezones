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
 * Execute a search and return ranked results. Blends MiniSearch's relevance
 * score with each document's popularity so well-known cities/zones float to
 * the top for ambiguous queries.
 */
export async function searchAll(query: string, limit = 8): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const ms = await loadSearchIndex();
    const raw = ms.search(q);

    return raw
      .map((r) => {
        const popularity = typeof r.popularity === 'number' ? r.popularity : 0;
        return { hit: r, finalScore: r.score * (1 + popularity / 200) };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit)
      .map(({ hit }) => hit as unknown as SearchResult);
  } catch {
    return [];
  }
}

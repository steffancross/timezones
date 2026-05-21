/**
 * Diagnostic: load the built search index and probe the ranking pipeline.
 * Mirrors lib/search/runtime.ts so we can verify ranking changes without
 * booting the browser. Not part of the regular build pipeline.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import MiniSearch from 'minisearch';
import { SEARCH_CONFIG } from '@/lib/search/config';

const INDEX_PATH = join(import.meta.dirname, '..', 'public', 'search-index.json');

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

async function main() {
  const data = JSON.parse(await readFile(INDEX_PATH, 'utf-8'));
  const idx = MiniSearch.loadJS(data, SEARCH_CONFIG);

  const queries = ['l', 'lo', 'los', 'lon', 'lond', 'lhr', 'pst', 'tok'];

  for (const q of queries) {
    const qLower = q.toLowerCase();
    const raw = idx.search(q, { boost: boostsForLength(q.length) });

    const ranked = raw
      .map((r) => {
        const popularity = typeof r.popularity === 'number' ? r.popularity : 0;
        const displayName = typeof r.display_name === 'string' ? r.display_name : '';
        const prefixBonus = displayName.toLowerCase().startsWith(qLower) ? 1.5 : 1;
        const finalScore = (r.score + popularity * 0.5) * prefixBonus;
        return { r, popularity, prefixBonus, finalScore };
      })
      .sort((a, b) => b.finalScore - a.finalScore);

    console.warn(`\n=== "${q}" (top 10) ===`);
    for (const { r, popularity, prefixBonus, finalScore } of ranked.slice(0, 10)) {
      const ms = r.score.toFixed(2);
      const fs = finalScore.toFixed(2);
      const prefix = prefixBonus > 1 ? ' ★' : '  ';
      console.warn(
        `${prefix} ${r.type}: ${r.display_name.padEnd(25)} | pop=${String(popularity).padStart(3)} | ms=${ms.padStart(6)} | final=${fs.padStart(6)}`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Smoke test: load the built search index and probe a few common queries.
 * One-shot — not part of the regular pipeline.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import MiniSearch from 'minisearch';
import { SEARCH_CONFIG } from '@/lib/search/config';

const INDEX_PATH = join(import.meta.dirname, '..', 'public', 'search-index.json');

async function main() {
  const data = JSON.parse(await readFile(INDEX_PATH, 'utf-8'));
  const idx = MiniSearch.loadJS(data, SEARCH_CONFIG);

  for (const q of ['tokyo', 'JFK', 'PST', 'CST', 'pacific time']) {
    const r = idx.search(q, SEARCH_CONFIG.searchOptions);
    console.warn(`\n=== "${q}" (top 5) ===`);
    for (const hit of r.slice(0, 5)) {
      const score = typeof hit.score === 'number' ? hit.score.toFixed(2) : '?';
      console.warn(
        `  ${hit.type}: ${hit.display_name} | ${hit.display_secondary} | score=${score}`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

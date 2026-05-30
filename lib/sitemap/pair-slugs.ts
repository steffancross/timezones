import { zones } from '@/data/zones';
import { getAllCities } from '@/lib/cities/resolve';

/**
 * Pair slugs to pre-render at build time. The pair page route uses this for
 * `generateStaticParams`; everything else (the tier1×tier2 long tail) renders
 * on demand in the Worker (`dynamicParams = true`). Those on-demand renders are
 * NOT cached under the current read-only static-assets incremental cache — a
 * writable backend (R2/KV) would be needed to cache them. See the caching
 * notes / Linear ticket.
 *
 * Composition:
 *  - Zone × Zone (full N×N, excluding identity)
 *  - Tier 1 city × Tier 1 city (the popular city pairs)
 */
export function getCuratedPairSlugs(): string[] {
  const slugs = new Set<string>();

  for (const a of zones) {
    for (const b of zones) {
      if (a.id === b.id) continue;
      slugs.add(`${a.id}-to-${b.id}`);
    }
  }

  const tier1 = getAllCities().filter((c) => c.tier === 1);
  for (const a of tier1) {
    for (const b of tier1) {
      if (a.id === b.id) continue;
      slugs.add(`${a.id}-to-${b.id}`);
    }
  }

  return Array.from(slugs);
}

/**
 * Full set of valid pair slugs — used for the sitemap (J1). Adds Tier 1 ×
 * Tier 2 city pairs on top of the curated set.
 */
export function getAllPairSlugs(): string[] {
  const slugs = new Set<string>(getCuratedPairSlugs());

  const cities = getAllCities();
  const tier1 = cities.filter((c) => c.tier === 1);
  const tier2 = cities.filter((c) => c.tier === 2);

  for (const a of tier1) {
    for (const b of tier2) {
      slugs.add(`${a.id}-to-${b.id}`);
      slugs.add(`${b.id}-to-${a.id}`);
    }
  }

  return Array.from(slugs);
}

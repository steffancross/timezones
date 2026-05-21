import { zones } from '@/data/zones';
import { getAllCities } from '@/lib/cities/resolve';

export interface PopularPair {
  from: string;
  to: string;
  slug: string;
  label: string;
  popularity: number;
}

/**
 * Pair slugs to pre-render at build time. The pair page route uses this for
 * `generateStaticParams`; everything else is generated on demand via ISR and
 * cached in KV.
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
 * Top-N pair-page candidates ranked by averaged popularity, used by the
 * `/conversions` index. Composes zone × zone and Tier-1 city × Tier-1 city
 * pairs (same source set as `getCuratedPairSlugs`) but emits richer records
 * with labels for direct rendering.
 */
export function getPopularPairs(limit = 100): PopularPair[] {
  const pairs: PopularPair[] = [];

  for (const a of zones) {
    for (const b of zones) {
      if (a.id === b.id) continue;
      pairs.push({
        from: a.id,
        to: b.id,
        slug: `${a.id}-to-${b.id}`,
        label: `${a.id.toUpperCase()} to ${b.id.toUpperCase()}`,
        popularity: (a.popularity + b.popularity) / 2,
      });
    }
  }

  const tier1 = getAllCities().filter((c) => c.tier === 1);
  for (const a of tier1) {
    for (const b of tier1) {
      if (a.id === b.id) continue;
      pairs.push({
        from: a.id,
        to: b.id,
        slug: `${a.id}-to-${b.id}`,
        label: `${a.name} to ${b.name}`,
        popularity: (a.popularity + b.popularity) / 2,
      });
    }
  }

  return pairs.sort((a, b) => b.popularity - a.popularity).slice(0, limit);
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

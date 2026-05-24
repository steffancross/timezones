import { parsePairSlug } from '@/lib/slugs/parse';

export interface RelatedPair {
  slug: string;
  label: string;
  category: 'same-from' | 'same-to' | 'inverse';
}

const TIER_1_ZONES = ['pst', 'mst', 'cst', 'est', 'gmt', 'cet', 'jst', 'ist', 'aest'];

/**
 * Given a pair slug, return up to ~9 related-pair links:
 *   - Inverse pair (1)
 *   - Same "from", different "to" — Tier 1 zones (up to 4)
 *   - Same "to", different "from" — Tier 1 zones (up to 4)
 *
 * Curated `TIER_1_ZONES` is the source of truth for cross-linking targets —
 * `popularity` from zones data over-represents niche zones.
 */
export function getRelatedPairs(slug: string): RelatedPair[] {
  const pair = parsePairSlug(slug);
  if (!pair) return [];

  const fromId = pair.from.kind === 'zone' ? pair.from.zone.id : pair.from.city.id;
  const toId = pair.to.kind === 'zone' ? pair.to.zone.id : pair.to.city.id;
  const fromLabel =
    pair.from.kind === 'zone' ? pair.from.zone.id.toUpperCase() : pair.from.city.name;
  const toLabel = pair.to.kind === 'zone' ? pair.to.zone.id.toUpperCase() : pair.to.city.name;

  const results: RelatedPair[] = [];

  results.push({
    slug: `${toId}-to-${fromId}`,
    label: `${toLabel} to ${fromLabel}`,
    category: 'inverse',
  });

  const sameFrom = TIER_1_ZONES.filter((z) => z !== fromId && z !== toId)
    .slice(0, 4)
    .map<RelatedPair>((z) => ({
      slug: `${fromId}-to-${z}`,
      label: `${fromLabel} to ${z.toUpperCase()}`,
      category: 'same-from',
    }));
  results.push(...sameFrom);

  const sameTo = TIER_1_ZONES.filter((z) => z !== fromId && z !== toId)
    .slice(0, 4)
    .map<RelatedPair>((z) => ({
      slug: `${z}-to-${toId}`,
      label: `${z.toUpperCase()} to ${toLabel}`,
      category: 'same-to',
    }));
  results.push(...sameTo);

  return results.slice(0, 12);
}

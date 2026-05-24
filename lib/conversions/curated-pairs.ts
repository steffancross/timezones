/**
 * Hand-curated list of pair slugs to feature on the /conversions popular grid.
 *
 * Order matters — cards render in this order. Update periodically based on
 * analytics (top-searched pair pages, top organic-landing pair pages).
 *
 * Slug format: `{from-id}-to-{to-id}` where each id is either a zone id
 * (e.g. `pst`, `gmt`, `jst`) or a city id (e.g. `new-york`, `tokyo`).
 * Mixed zone/city pairs are fine (`pst-to-tokyo`). Slugs that fail to resolve
 * at runtime are silently dropped — easier to spot in dev than to ship a 404
 * on click.
 *
 * To find available ids:
 *   - zones: `data/zones.ts`
 *   - cities: `data/cities.json` (Tier 1 only is the sensible subset)
 */
export const CURATED_PAIR_SLUGS: readonly string[] = [
  // US internal — cross-country traffic. Both directions for the headline pair.
  'pst-to-est',
  'est-to-pst',
  'cst-to-est',
  'mst-to-est',
  'pst-to-cst',

  // India — US and Europe remote-work corridor (uses `london` city, not `gmt`).
  'pst-to-ist',
  'est-to-ist',
  'cst-to-ist',
  'cet-to-ist',

  // UK — three angles into London.
  'est-to-london',
  'pst-to-london',
  'ist-to-london',

  // Rest — major US-anchored pairs into Asia, Europe, Oceania.
  'pst-to-jst',
  'pst-to-sgt',
  'est-to-cet',
  'est-to-aest',
];

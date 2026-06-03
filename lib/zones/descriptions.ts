import descriptions from '@/data/zone-descriptions.json';

/**
 * Hand-authored editorial prose per curated zone, keyed by zone id. This is the
 * differentiator that keeps the 49 zone pages from reading as templated
 * boilerplate. Committed to `data/zone-descriptions.json` (field format below);
 * partial/empty is fine — every consumer degrades gracefully when a key is
 * absent.
 */
export interface ZoneDescription {
  /**
   * Meta-only one-liner — the `<meta description>` and the "What is X?" FAQ
   * answer. NOT rendered on the page. ~150–160 chars, lead with abbr + offset.
   */
  summary: string;
  /**
   * Differentiated prose: why the zone matters / what it's like to live with.
   * Plain text, no markup; `\n\n` splits paragraphs. Mechanics (offset, DST,
   * cities) are owned by other sections — omit them here. Optional: a zone with
   * no real human story (e.g. "+2, same as the neighbor, no DST") should omit
   * `body` entirely rather than carry filler — the prose block is then skipped.
   */
  body?: string;
  /** Optional "huh, didn't know that" callout — a genuine surprise, not a mechanics footnote. */
  quirk?: string;
}

const data = descriptions as Record<string, ZoneDescription>;

/** Returns the authored description for a zone id, or null if none is written yet. */
export function getZoneDescription(id: string): ZoneDescription | null {
  return data[id] ?? null;
}

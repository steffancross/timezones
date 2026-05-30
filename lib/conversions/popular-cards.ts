import { resolveSlugSegment, type ZoneOrCity } from '@/lib/slugs/parse';
import { currentOffsetBetween } from '@/lib/time/luxon';
import { standardAbbreviation } from '@/lib/zones/abbreviation';
import { CURATED_PAIR_SLUGS } from './curated-pairs';

export interface PopularCard {
  slug: string;
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  fromCode: string;
  toCode: string;
  /** Signed hours, e.g. "+3h" / "−5h30" / "0h". From is the reference. */
  deltaLabel: string;
}

function nameOf(entry: ZoneOrCity): string {
  return entry.kind === 'zone' ? entry.zone.display_name : entry.city.name;
}

function codeOf(entry: ZoneOrCity): string {
  if (entry.kind === 'zone') return entry.zone.abbreviations[0] ?? entry.zone.id.toUpperCase();
  return standardAbbreviation(entry.city.iana);
}

function formatDelta(minutes: number): string {
  if (minutes === 0) return '0h';
  const sign = minutes > 0 ? '+' : '−';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${sign}${h}h` : `${sign}${h}h${m}`;
}

function splitPairSlug(slug: string): [string, string] | null {
  const parts = slug.split('-to-');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return [parts[0], parts[1]];
}

/**
 * Hand-curated pair cards for the /conversions popular grid. Source list is
 * `CURATED_PAIR_SLUGS` — edit that file to change what shows up. Slugs that
 * fail to resolve (typo, missing city, etc.) are silently dropped.
 */
export function getPopularCards(): PopularCard[] {
  const cards: PopularCard[] = [];

  for (const slug of CURATED_PAIR_SLUGS) {
    const parts = splitPairSlug(slug);
    if (!parts) continue;
    const [fromId, toId] = parts;

    const from = resolveSlugSegment(fromId);
    const to = resolveSlugSegment(toId);
    if (!from || !to) continue;

    const fromIana = from.kind === 'zone' ? from.zone.iana : from.city.iana;
    const toIana = to.kind === 'zone' ? to.zone.iana : to.city.iana;

    cards.push({
      slug,
      fromId,
      toId,
      fromName: nameOf(from),
      toName: nameOf(to),
      fromCode: codeOf(from),
      toCode: codeOf(to),
      deltaLabel: formatDelta(currentOffsetBetween(toIana, fromIana)),
    });
  }

  return cards;
}

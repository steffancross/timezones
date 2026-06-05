import { humanizeOffset, seasonalOffsets } from '@/lib/seo/zone-facts';
import type { ParsedPair, ZoneOrCity } from '@/lib/slugs/parse';
import { resolveZoneForIana } from '@/lib/zones/resolve';

/**
 * Title + meta-description generators for the `/convert/[slug]` pair pages.
 *
 * Pure, build-time, and intentionally **evergreen**: `generateMetadata` runs at
 * build and the resulting tags do NOT self-heal on hydration (unlike the page
 * body). So every number here is derived from the standard/daylight offset
 * *relationship*, never from a live "now" — a baked clock time would go stale at
 * the next DST flip. See the conversion-page metadata spec for the full rationale.
 *
 * Everything keys off the IANA, so a city side (`est-to-tokyo`,
 * `new-york-to-london`) works identically to a zone side — DST is detected from
 * the zone's own offset rules and the daylight abbreviation is resolved through
 * the city's curated zone.
 */

/** Short, search-friendly token for a side: the abbreviation for a zone, the name for a city. */
function abbrevToken(zoc: ZoneOrCity): string {
  return zoc.kind === 'zone'
    ? (zoc.zone.abbreviations[0] ?? zoc.zone.id.toUpperCase())
    : zoc.city.name;
}

/** Display name minus the trailing "(Standard|Daylight) Time": "Eastern Time"→"Eastern", "India Standard Time"→"India". */
function shortName(zoc: ZoneOrCity): string {
  if (zoc.kind === 'city') return zoc.city.name;
  return zoc.zone.display_name.replace(/\s+(?:Standard\s+|Daylight\s+)?Time$/i, '');
}

/** The daylight (DST) abbreviation for a side, e.g. "EDT" — via the curated zone for cities. Null if uncurated. */
function daylightAbbrev(zoc: ZoneOrCity): string | null {
  const zone = zoc.kind === 'zone' ? zoc.zone : resolveZoneForIana(zoc.city.iana);
  return zone?.abbreviations[1] ?? null;
}

/** Compact decimal for clean half-hour offsets ("9.5 hours", "10 hours"), else falls back to the natural form. */
function humanizeOffsetShort(min: number): string {
  if (min % 30 === 0) {
    const h = min / 60;
    const label = Number.isInteger(h) ? `${h}` : h.toFixed(1);
    return `${label} hour${min === 60 ? '' : 's'}`;
  }
  return humanizeOffset(min);
}

function directionWord(gap: number): string {
  return gap > 0 ? 'ahead of' : 'behind';
}

interface PairFacts {
  fromAbbr: string;
  toAbbr: string;
  /** Standard-time gap (minutes), `to` relative to `from`: + means `to` is ahead. Leads the description. */
  stdGap: number;
  /** Daylight-season gap (minutes). */
  altGap: number;
  /** True when the two seasonal gaps differ — a DST clause is warranted. */
  varies: boolean;
  fromDst: boolean;
  toDst: boolean;
}

function pairFacts(pair: ParsedPair): PairFacts {
  const from = seasonalOffsets(pair.fromIana);
  const to = seasonalOffsets(pair.toIana);
  const winterGap = to.jan - from.jan;
  const summerGap = to.jul - from.jul;
  return {
    fromAbbr: abbrevToken(pair.from),
    toAbbr: abbrevToken(pair.to),
    stdGap: winterGap,
    altGap: summerGap,
    varies: winterGap !== summerGap,
    fromDst: from.jan !== from.jul,
    toDst: to.jan !== to.jul,
  };
}

/** The lead clause every description opens with: "IST is 10 hours 30 minutes ahead of EST" (or "matches"). */
function leadClause(f: PairFacts): string {
  if (f.stdGap === 0) return `${f.toAbbr} matches ${f.fromAbbr}`;
  return `${f.toAbbr} is ${humanizeOffset(Math.abs(f.stdGap))} ${directionWord(f.stdGap)} ${f.fromAbbr}`;
}

export function buildPairTitle(pair: ParsedPair): string {
  const fromAbbr = abbrevToken(pair.from);
  const toAbbr = abbrevToken(pair.to);
  if (pair.from.kind === 'zone' && pair.to.kind === 'zone') {
    return `${fromAbbr} to ${toAbbr} Converter — ${shortName(pair.from)} to ${shortName(pair.to)} Time`;
  }
  return `${fromAbbr} to ${toAbbr} Time Converter`;
}

export function buildPairDescription(pair: ParsedPair): string {
  const f = pairFacts(pair);
  const lead = leadClause(f);
  const oneSideDst = f.fromDst !== f.toDst;

  // Branch C — both sides observe DST and the gap swings with the season
  // (opposite hemispheres / mismatched schedules). A single "during X" number
  // is meaningless, so quote the range.
  if (f.varies && !oneSideDst) {
    const lo = Math.min(Math.abs(f.stdGap), Math.abs(f.altGap));
    const hi = Math.max(Math.abs(f.stdGap), Math.abs(f.altGap));
    const dir = directionWord(f.stdGap || f.altGap);
    return `${f.toAbbr} is ${humanizeOffset(lo)}–${humanizeOffset(hi)} ${dir} ${f.fromAbbr} depending on daylight saving. Both observe DST on opposite schedules. Hour-by-hour table.`;
  }

  // Branch A — exactly one side observes DST, so the gap shifts by an hour for
  // part of the year. Lead with the evergreen standard-time gap, then the
  // daylight-season gap labelled by the observing side's DST abbreviation.
  if (f.varies && oneSideDst) {
    const dstSide = f.fromDst ? pair.from : pair.to;
    const nonDstSide = f.fromDst ? pair.to : pair.from;
    const dstAbbrev = daylightAbbrev(dstSide) ?? 'daylight time';
    const facts = `${shortName(nonDstSide)} has no DST; ${shortName(dstSide)} observes daylight saving`;
    return `${lead}, or ${humanizeOffsetShort(Math.abs(f.altGap))} during ${dstAbbrev}. ${facts}. Hour-by-hour table.`;
  }

  // Branch B — the gap is constant all year (neither side observes DST, or both
  // shift together so the offset never changes).
  const facts =
    f.fromDst && f.toDst
      ? 'Both shift for daylight saving, so the gap holds year-round'
      : 'Neither zone observes daylight saving';
  return `${lead}. ${facts}. Hour-by-hour conversion table.`;
}

import { resolveSlugSegment } from '@/lib/slugs/parse';
import type { ParsedPair, ZoneOrCity } from '@/lib/slugs/parse';
import type { TimeFormat } from '@/lib/time/format';
import type { ConverterState, ZoneRef } from './converter';

export interface UrlState {
  pair?: ParsedPair;
  /** Explicit zone list parsed from the `z=` query param. Overrides `pair`. */
  zones?: ZoneRef[];
  date?: string;
  /** Half-open range in home-zone minutes-of-day (multiples of 15). */
  rangeStartMin?: number;
  rangeEndMin?: number;
  format?: TimeFormat;
}

const MIN_DAY = 1440;

export function urlToState(input: UrlState): Partial<ConverterState> {
  const partial: Partial<ConverterState> = {};

  if (input.zones && input.zones.length > 0) {
    partial.zones = input.zones;
    partial.homeZoneIndex = 0;
  } else if (input.pair) {
    const zones: ZoneRef[] = [zoneOrCityToRef(input.pair.from), zoneOrCityToRef(input.pair.to)];
    partial.zones = zones;
    // The URL's "from" zone is the home zone — hours/dates are expressed in
    // its local time. NOT the user's local zone (cf-timezone) — that's a
    // separate "your local" indicator the page route (G3) layers on top.
    partial.homeZoneIndex = 0;
  }

  if (input.date && isValidIsoDate(input.date)) {
    partial.anchorDate = input.date;
  }

  if (isValidRangeMinutes(input.rangeStartMin, input.rangeEndMin)) {
    partial.rangeStartMin = input.rangeStartMin;
    partial.rangeEndMin = input.rangeEndMin;
  }

  if (input.format === '12' || input.format === '24') {
    partial.format = input.format;
  }

  return partial;
}

function zoneOrCityToRef(zoc: ZoneOrCity): ZoneRef {
  if (zoc.kind === 'zone') {
    return { kind: 'zone', slug: zoc.zone.id, iana: zoc.zone.iana };
  }
  return { kind: 'city', slug: zoc.city.id, iana: zoc.city.iana };
}

/**
 * Valid half-open range in minutes: both multiples of 15, start in [0, 1425],
 * end in [start+15, 1440]. Mirrors the store's `setRangeMinutes` clamp so a URL
 * can't seed an out-of-bounds or inverted range.
 */
function isValidRangeMinutes(start: number | undefined, end: number | undefined): boolean {
  if (typeof start !== 'number' || typeof end !== 'number') return false;
  if (start % 15 !== 0 || end % 15 !== 0) return false;
  if (start < 0 || start > MIN_DAY - 15) return false;
  if (end < start + 15 || end > MIN_DAY) return false;
  return true;
}

function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function parseSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): Omit<UrlState, 'pair'> {
  const date = single(searchParams.d);
  const rangeRaw = single(searchParams.r);
  const formatRaw = single(searchParams.f);
  const zonesRaw = single(searchParams.z);

  const { rangeStartMin, rangeEndMin } = parseRangeParam(rangeRaw);
  const format = formatRaw === '12' || formatRaw === '24' ? formatRaw : undefined;
  const zones = zonesRaw ? parseZonesParam(zonesRaw) : undefined;

  return {
    date,
    rangeStartMin,
    rangeEndMin,
    format,
    zones,
  };
}

/**
 * Parse the `r=HHmm-HHmm` query param (zero-padded 24h, half-open). The `2400`
 * sentinel means next-day midnight (1440 min). Returns undefined for anything
 * malformed — the caller drops the partial rather than half-applying it. Bounds
 * and step are re-checked downstream by `isValidRangeMinutes`.
 */
function parseRangeParam(raw: string | undefined): {
  rangeStartMin: number | undefined;
  rangeEndMin: number | undefined;
} {
  const none = { rangeStartMin: undefined, rangeEndMin: undefined };
  if (!raw) return none;
  const m = raw.match(/^(\d{4})-(\d{4})$/);
  if (!m) return none;
  const start = hhmmToMin(m[1] as string);
  const end = hhmmToMin(m[2] as string);
  if (start === null || end === null) return none;
  return { rangeStartMin: start, rangeEndMin: end };
}

/** `HHmm` → minutes-of-day. `2400` → 1440. Rejects HH>24, the 24xx range, mm>59. */
function hhmmToMin(s: string): number | null {
  const hh = Number.parseInt(s.slice(0, 2), 10);
  const mm = Number.parseInt(s.slice(2), 10);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh === 24) return mm === 0 ? 1440 : null;
  if (hh > 23 || mm > 59) return null;
  return hh * 60 + mm;
}

function parseZonesParam(raw: string): ZoneRef[] | undefined {
  const refs: ZoneRef[] = [];
  for (const segment of raw.split(',')) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const resolved = resolveSlugSegment(trimmed);
    if (!resolved) continue;
    refs.push(zoneOrCityToRef(resolved));
  }
  return refs.length > 0 ? refs : undefined;
}

function single(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

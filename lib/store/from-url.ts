import { resolveSlugSegment } from '@/lib/slugs/parse';
import type { ParsedPair, ZoneOrCity } from '@/lib/slugs/parse';
import type { TimeFormat } from '@/lib/time/format';
import type { ConverterState, ZoneRef } from './converter';

export interface UrlState {
  pair?: ParsedPair;
  /** Explicit zone list parsed from the `z=` query param. Overrides `pair`. */
  zones?: ZoneRef[];
  date?: string;
  hour?: number;
  format?: TimeFormat;
}

export function urlToState(input: UrlState): Partial<ConverterState> {
  const partial: Partial<ConverterState> = {};

  if (input.zones && input.zones.length > 0) {
    partial.zones = input.zones;
    partial.homeZoneIndex = 0;
  } else if (input.pair) {
    const zones: ZoneRef[] = [zoneOrCityToRef(input.pair.from), zoneOrCityToRef(input.pair.to)];
    partial.zones = zones;
    // The URL's "from" zone is the anchor zone — hours/dates are expressed in
    // its local time. NOT the user's local zone (cf-timezone) — that's a
    // separate "your local" indicator the page route (G3) layers on top.
    partial.homeZoneIndex = 0;
  }

  if (input.date && isValidIsoDate(input.date)) {
    partial.anchorDate = input.date;
  }

  if (typeof input.hour === 'number' && input.hour >= 0 && input.hour <= 23) {
    partial.anchorHour = input.hour;
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

function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function parseSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): Omit<UrlState, 'pair'> {
  const date = single(searchParams.d);
  const hourStr = single(searchParams.h);
  const formatRaw = single(searchParams.f);
  const zonesRaw = single(searchParams.z);

  const hour = hourStr !== undefined ? Number.parseInt(hourStr, 10) : undefined;
  const format = formatRaw === '12' || formatRaw === '24' ? formatRaw : undefined;
  const zones = zonesRaw ? parseZonesParam(zonesRaw) : undefined;

  return {
    date,
    hour: hour !== undefined && Number.isFinite(hour) ? hour : undefined,
    format,
    zones,
  };
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

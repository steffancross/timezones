import type { Zone } from '@/lib/zones/types';

/**
 * Smart Converter — shared result types for the pure parsing pipeline.
 *
 * The pipeline (normalize → parse → classify) turns a block of pasted text into
 * a list of `ParsedEvent`s. `convert` then turns each resolved event into a
 * `ConvertedEvent` (the fields a card renders) using Luxon — DST-correct for the
 * event's own date. Nothing in here touches React or the DOM.
 */

/** A wall-clock date/time as extracted from text, before any zone math. */
export interface EventTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /**
   * True when the text gave a date but no clock time ("April 29"). The card
   * treats it as an all-day / midnight anchor rather than implying a time.
   */
  timeImplied: boolean;
}

/**
 * How an event's source zone was determined.
 * - `named`     — `resolveZone` matched a city/region/abbreviation unambiguously.
 * - `offset`    — an explicit numeric offset ("GMT+8"). Fixed; no DST.
 * - `inherited` — no zone token, but an earlier event in the same paste had one
 *                 (rule 3). Carries that zone forward.
 * - `target`    — no zone anywhere; assumed to be the viewer's own zone (rule 1).
 *                 The card MUST flag this as an assumption ("assumed your time").
 */
export type ZoneResolution =
  | { kind: 'named'; zone: Zone; iana: string }
  | { kind: 'offset'; minutes: number; label: string }
  | { kind: 'inherited'; zone: Zone; iana: string }
  | { kind: 'target'; iana: string };

interface BaseEvent {
  /** Start index of the match within the (length-preserving) normalized text. */
  matchIndex: number;
  /** The matched snippet text, e.g. "april 29 at 8:00 pm". */
  matchText: string;
  /** Raw zone token as it appeared ("(GMT+8)", "CST", "Beijing time"), or null. */
  zoneTokenText: string | null;
  /** Start index of the zone token in the normalized text, for highlighting. */
  zoneTokenIndex: number | null;
}

export interface ResolvedEvent extends BaseEvent {
  status: 'resolved';
  zone: ZoneResolution;
  start: EventTime;
  /** Non-null when the text expressed a range; the closing endpoint. */
  end: EventTime | null;
  hasRange: boolean;
}

export interface AmbiguousEvent extends BaseEvent {
  status: 'ambiguous';
  /** The ambiguous token as typed, e.g. "CST". */
  token: string;
  /**
   * Every zone the token could mean (canonical first), straight from
   * `resolveZone`. We never auto-pick — the user chooses.
   */
  candidates: Zone[];
  /** The wall-clock is known; only the zone is unresolved — so we keep start/end. */
  start: EventTime;
  end: EventTime | null;
  hasRange: boolean;
}

export interface UnknownEvent extends BaseEvent {
  status: 'unknown';
  /** The bit of text we found but couldn't lock a date/time onto. */
  snippet: string;
}

export type ParsedEvent = ResolvedEvent | AmbiguousEvent | UnknownEvent;

/** Everything a resolved card renders, after Luxon conversion into the target. */
export interface ConvertedEvent {
  startInstantMs: number;
  endInstantMs: number | null;
  /** `formatDate` of the start in the target zone, e.g. "Wed, May 14". */
  startDate: string;
  /** `formatClock` of the start in the target zone. */
  startClock: string;
  endDate: string | null;
  endClock: string | null;
  /** Whole-day span length for ranges (rule 4), else null. */
  durationDays: number | null;
  /** DST-aware abbreviation of the TARGET zone at the start instant. */
  targetAbbr: string;
  /** `formatOffset` of the target zone at the start instant. */
  targetOffsetLabel: string;
  /** The source wall-clock as stated, for the echo/source line ("8:00 PM GMT+8"). */
  sourceLabel: string;
}

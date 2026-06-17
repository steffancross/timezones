// The availability blob — the core data contract for the whole feature (spec 1).
//
// A participant's recurring week is a 336-character string over the charset
// `n`/`y`/`s`. `index = dowIndex * 48 + halfHour`, where `dowIndex` is
// Monday=0 … Sunday=6 (NOT Luxon's Mon=1 weekday, and NOT the Sunday-first
// display order specs 3–4 use) and `halfHour` is 0..47 (local 00:00 … 23:30).
// The blob is interpreted in the participant's own timezone — storage is always
// local-frame; never pre-convert to UTC or a reference zone.
//
// Validation is strict and THROWS — a malformed blob is a bug we want loud, not
// silently repaired.

import { MAX_OVERRIDES_BYTES, SLOTS_PER_DAY, WEEK_SLOTS } from './config';

export type SlotState = 'n' | 'y' | 's';

/** ISO date → 48-char day blob (n/y/s), keyed in the participant's own zone. */
export type Overrides = Record<string, string>;

const CHARSET = /^[nys]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function assertBlob(blob: string, length: number, label: string): void {
  if (typeof blob !== 'string' || blob.length !== length) {
    throw new Error(`${label}: expected a ${length}-char string, got length ${blob?.length}`);
  }
  if (!CHARSET.test(blob)) {
    throw new Error(`${label}: contains characters outside the n/y/s charset`);
  }
}

/** 336-char week blob → SlotState[336]. Throws on bad length or charset. */
export function parseWeek(blob: string): SlotState[] {
  assertBlob(blob, WEEK_SLOTS, 'parseWeek');
  return blob.split('') as SlotState[];
}

/** SlotState[336] → 336-char blob. Exact inverse of parseWeek. Throws on bad length/charset. */
export function serializeWeek(slots: SlotState[]): string {
  if (slots.length !== WEEK_SLOTS) {
    throw new Error(`serializeWeek: expected ${WEEK_SLOTS} slots, got ${slots.length}`);
  }
  const blob = slots.join('');
  assertBlob(blob, WEEK_SLOTS, 'serializeWeek');
  return blob;
}

/** A fully-unavailable week: 336 `n`s. (Distinct from an *unset* week, which is stored as null.) */
export function emptyWeek(): string {
  return 'n'.repeat(WEEK_SLOTS);
}

/** 48-char day blob → SlotState[48]. Used by overrides. Throws on bad length/charset. */
export function parseDay(blob: string): SlotState[] {
  assertBlob(blob, SLOTS_PER_DAY, 'parseDay');
  return blob.split('') as SlotState[];
}

/** SlotState[48] → 48-char day blob. Exact inverse of parseDay. */
export function serializeDay(slots: SlotState[]): string {
  if (slots.length !== SLOTS_PER_DAY) {
    throw new Error(`serializeDay: expected ${SLOTS_PER_DAY} slots, got ${slots.length}`);
  }
  const blob = slots.join('');
  assertBlob(blob, SLOTS_PER_DAY, 'serializeDay');
  return blob;
}

/** True iff `s` is a real calendar date in YYYY-MM-DD form (rejects 2026-13-40, 2026-02-30, …). */
function isValidIsoDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  if (m < 1 || m > 12 || d < 1) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const max = daysInMonth[m - 1]; // m is validated 1..12
  return max !== undefined && d <= max;
}

/**
 * Validate (and narrow) an unknown value as an Overrides map. Throws on any
 * malformed key (bad/unreal date), value (not a 48-char n/y/s day), or an
 * over-cap total serialized size. Returns the same map typed.
 */
export function validateOverrides(o: unknown): Overrides {
  if (o === null || typeof o !== 'object' || Array.isArray(o)) {
    throw new Error('validateOverrides: expected a plain object');
  }
  const map = o as Record<string, unknown>;
  for (const [date, day] of Object.entries(map)) {
    if (!isValidIsoDate(date)) {
      throw new Error(`validateOverrides: invalid date key "${date}"`);
    }
    if (typeof day !== 'string') {
      throw new Error(`validateOverrides: value for "${date}" is not a string`);
    }
    // Reuse the strict day validator (length 48 + charset).
    parseDay(day);
  }
  const size = JSON.stringify(map).length;
  if (size > MAX_OVERRIDES_BYTES) {
    throw new Error(`validateOverrides: ${size} bytes exceeds cap ${MAX_OVERRIDES_BYTES}`);
  }
  return map as Overrides;
}

// --- Weekday convention helper (the footgun, centralized) ------------------
//
// Storage uses Monday=0 … Sunday=6. Luxon's `DateTime.weekday` is Monday=1 …
// Sunday=7. Route EVERY conversion through these two helpers — never open-code
// `weekday - 1` at a call site, which is exactly where off-by-one bugs breed.

/** Luxon weekday (Mon=1 … Sun=7) → blob day index (Mon=0 … Sun=6). */
export function blobDow(luxonWeekday: number): number {
  if (!Number.isInteger(luxonWeekday) || luxonWeekday < 1 || luxonWeekday > 7) {
    throw new Error(`blobDow: expected a Luxon weekday 1..7, got ${luxonWeekday}`);
  }
  return luxonWeekday - 1;
}

/** Blob day index (Mon=0 … Sun=6) → Luxon weekday (Mon=1 … Sun=7). */
export function blobDowToLuxonWeekday(dowIndex: number): number {
  if (!Number.isInteger(dowIndex) || dowIndex < 0 || dowIndex > 6) {
    throw new Error(`blobDowToLuxonWeekday: expected a blob day index 0..6, got ${dowIndex}`);
  }
  return dowIndex + 1;
}

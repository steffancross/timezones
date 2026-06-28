import { resolveZone } from '@/lib/zones/resolve';
import * as chrono from 'chrono-node';
import { OFFSET_RE, parseOffsetToken } from './offset-token';
import type { EventTime } from './types';

/**
 * Smart Converter — date/time extraction (pipeline step 2).
 *
 * Two jobs, two tools — taken all the way: we resolve ZONES out of the text
 * FIRST, blank them out (length-preserving), and only then hand the cleaned text
 * to chrono. This matters because a zone token sitting between a time and its
 * date silently breaks chrono's datetime merge — "15:00 Beijing time on Aug 10"
 * parses as TWO events ("15:00" + "Aug 10") with the real reading lost. Blanking
 * "Beijing time" first lets chrono merge them into one. (Verified against the
 * eval corpus: this is the single biggest source of silent-wrong results.)
 *
 * chrono then does only what it's good at — pull wall-clock components + ranges —
 * and we ignore its `timezoneOffset` entirely. We re-attach each event to the
 * nearest zone token by position. `forwardDate: true` resolves omitted years and
 * bare weekdays to the next future occurrence (rules 2 & 5).
 */

export interface RawMatch {
  /** Start index within the normalized (length-preserving) text. */
  index: number;
  /** The matched snippet (date/time only; the zone was blanked before parsing). */
  text: string;
  start: EventTime;
  /** Present when chrono parsed a range ("Sep 24-27"); the closing endpoint. */
  end: EventTime | null;
  hasRange: boolean;
  /** Raw zone token re-attached to this event ("GMT+8", "EST", "Beijing time"), or null. */
  rawZoneToken: string | null;
  /** Start index of that zone token in the normalized text, for highlighting. */
  zoneTokenIndex: number | null;
}

interface ZoneToken {
  /** Clean token span (for association + the rawZoneToken value). */
  start: number;
  end: number;
  raw: string;
  /** Wider span to blank from chrono's view (includes wrapping parens). */
  blankStart: number;
  blankEnd: number;
}

const MAX_GAP = 28; // chars between an event and its zone token to still associate

// Up to 3 words before "time"; we shrink from the left to the longest that resolves.
const TIME_PHRASE_RE = /((?:[A-Za-z]+\s+){1,3})time\b/gi;
// Case-insensitive so casual "cet"/"pst" are caught (resolveZone is also
// case-insensitive); collisions are guarded below.
const ABBR_RE = /\b[A-Za-z]{2,5}\b/gi;
const MERIDIEM = new Set(['AM', 'PM']);
// Zone abbreviations that are also common English words. Honored ONLY when typed
// in all-caps — otherwise "feed the cat at 8pm" would silently mean Central
// Africa Time. (Derived from intersecting our zone abbreviations with everyday words.)
const WORD_COLLISIONS = new Set(['AFT', 'ART', 'CAT', 'COT', 'EAT', 'PET', 'VET']);
const OPENERS = '([{';
const CLOSERS = ')]}';

/** Pull wall-clock fields off a chrono ParsingComponents. */
function toEventTime(c: chrono.ParsedComponents): EventTime {
  return {
    year: c.get('year') ?? new Date().getFullYear(),
    month: c.get('month') ?? 1,
    day: c.get('day') ?? 1,
    hour: c.get('hour') ?? 0,
    minute: c.get('minute') ?? 0,
    timeImplied: !c.isCertain('hour'),
  };
}

function overlapsAny(start: number, end: number, spans: ZoneToken[]): boolean {
  return spans.some((s) => start < s.end && end > s.start);
}

/**
 * Find every real zone reference in the text. A candidate only counts if it
 * actually resolves (offset parses, or resolveZone recognizes it) — so we never
 * blank an unrelated all-caps word and rob chrono of a date token.
 * Priority offset > phrase > abbreviation; overlaps are dropped.
 */
function scanZoneTokens(text: string): ZoneToken[] {
  const found: ZoneToken[] = [];
  const add = (start: number, raw: string) => {
    const end = start + raw.length;
    if (overlapsAny(start, end, found)) return;
    // Blank any wrapping bracket too, so "(GMT+8)" doesn't leave orphaned "( )"
    // that severs a trailing year from the time.
    let blankStart = start;
    let blankEnd = end;
    if (start > 0 && OPENERS.includes(text[start - 1] ?? '') && CLOSERS.includes(text[end] ?? '')) {
      blankStart = start - 1;
      blankEnd = end + 1;
    }
    found.push({ start, end, raw, blankStart, blankEnd });
  };

  for (const m of text.matchAll(OFFSET_RE)) {
    if (m.index != null && parseOffsetToken(m[0].trim())) add(m.index, m[0]);
  }
  // For each "<words> time", shrink from the left to the longest place name that
  // resolves — so "midnight Pacific time" yields "Pacific time", not a non-match.
  for (const m of text.matchAll(TIME_PHRASE_RE)) {
    if (m.index == null) continue;
    let phrase = m[0];
    let off = 0;
    while (phrase) {
      if (resolveZone(phrase)) {
        add(m.index + off, phrase);
        break;
      }
      const lead = /^[A-Za-z]+\s+/.exec(phrase);
      if (!lead) break;
      off += lead[0].length;
      phrase = phrase.slice(lead[0].length);
    }
  }
  for (const m of text.matchAll(ABBR_RE)) {
    if (m.index == null) continue;
    const tok = m[0];
    const upper = tok.toUpperCase();
    if (MERIDIEM.has(upper)) continue;
    // For word-collision abbreviations, require all-caps (intentional zone use).
    if (tok !== upper && WORD_COLLISIONS.has(upper)) continue;
    if (resolveZone(tok)) add(m.index, tok);
  }

  return found.sort((a, b) => a.start - b.start);
}

/** Replace each token's blank-span with equal-length spaces (positions preserved). */
function blankSpans(text: string, spans: ZoneToken[]): string {
  let out = text;
  for (const s of spans) {
    out =
      out.slice(0, s.blankStart) + ' '.repeat(s.blankEnd - s.blankStart) + out.slice(s.blankEnd);
  }
  return out;
}

/** Distance from a [ms,me) interval to a token (0 if they overlap). */
function gap(ms: number, me: number, t: ZoneToken): number {
  if (t.start < me && t.end > ms) return 0;
  return t.start >= me ? t.start - me : ms - t.end;
}

/** Chrono result reduced to what merge + association need. */
interface Interm {
  index: number;
  end: number;
  text: string;
  start: EventTime;
  endTime: EventTime | null;
  hasRange: boolean;
  hourCertain: boolean;
  dateCertain: boolean;
}

const MAX_MERGE_GAP = 12; // chars of filler allowed between a split time and date

function toInterm(r: chrono.ParsedResult): Interm {
  return {
    index: r.index,
    end: r.index + r.text.length,
    text: r.text,
    start: toEventTime(r.start),
    endTime: r.end ? toEventTime(r.end) : null,
    hasRange: r.end != null,
    hourCertain: r.start.isCertain('hour'),
    dateCertain:
      r.start.isCertain('day') || r.start.isCertain('month') || r.start.isCertain('weekday'),
  };
}

/**
 * Re-merge a time-only event with an adjacent date-only one that chrono split
 * apart because filler interrupted them ("noon sharp on July 4", "8pm-ish Sat").
 * Conservative on purpose: only across a short gap with no sentence break, so
 * genuinely separate events ("Doors 7pm. Show Aug 5.") stay two.
 */
function reMerge(interms: Interm[], clean: string): Interm[] {
  const timeOnly = (x: Interm) => x.hourCertain && !x.dateCertain;
  const dateOnly = (x: Interm) => x.dateCertain && !x.hourCertain;
  const out: Interm[] = [];
  for (let i = 0; i < interms.length; i++) {
    const a = interms[i];
    const b = interms[i + 1];
    if (a && b) {
      const between = clean.slice(a.end, b.index);
      const adjacent = between.length <= MAX_MERGE_GAP && !/[.!?]/.test(between);
      const splittable = (timeOnly(a) && dateOnly(b)) || (dateOnly(a) && timeOnly(b));
      if (adjacent && splittable) {
        const timeSrc = a.hourCertain ? a : b;
        const dateSrc = a.dateCertain ? a : b;
        out.push({
          index: a.index,
          end: b.end,
          text: clean.slice(a.index, b.end).trim(),
          start: {
            year: dateSrc.start.year,
            month: dateSrc.start.month,
            day: dateSrc.start.day,
            hour: timeSrc.start.hour,
            minute: timeSrc.start.minute,
            timeImplied: false,
          },
          endTime: a.endTime ?? b.endTime,
          hasRange: a.hasRange || b.hasRange,
          hourCertain: true,
          dateCertain: true,
        });
        i++; // consumed b
        continue;
      }
    }
    if (a) out.push(a);
  }
  return out;
}

// A bare 24h "HH:MM" immediately before a date. chrono drops a leading 24h time
// when a bare date follows with no "at"/"on" connector ("16:00 March 12") — and
// zone-blanking can create exactly that shape ("16:00 GMT+8 Aug 5" → "16:00  Aug 5").
const DROPPED_TIME_RE = /(\d{1,2}):(\d{2})\s*$/;

/**
 * Recover a leading 24h time chrono silently discarded before a date-only event.
 * Bounded: only a clean "HH:MM" within 14 chars before the match (the `\s*$`
 * won't reach past a period), and only when the event has no time yet — so it
 * never overrides a time chrono did parse.
 */
function recoverDroppedTime(interms: Interm[], clean: string): Interm[] {
  for (const r of interms) {
    if (r.hourCertain) continue;
    const winStart = Math.max(0, r.index - 14);
    const m = DROPPED_TIME_RE.exec(clean.slice(winStart, r.index));
    if (!m) continue;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (hh > 23 || mm > 59) continue;
    r.start = { ...r.start, hour: hh, minute: mm, timeImplied: false };
    r.hourCertain = true;
    r.index = winStart + (m.index ?? 0);
    r.text = clean.slice(r.index, r.end).trim();
  }
  return interms;
}

export function extract(text: string, refDate: Date): RawMatch[] {
  const tokens = scanZoneTokens(text);
  const clean = blankSpans(text, tokens);
  const results = chrono.casual.parse(clean, refDate, { forwardDate: true });
  const interms = recoverDroppedTime(reMerge(results.map(toInterm), clean), clean);
  const used = new Set<ZoneToken>();

  return interms.map((r) => {
    const ms = r.index;
    const me = r.end;

    // Nearest unused zone token within range wins (left-to-right keeps the first
    // event from stealing a later event's zone).
    let best: ZoneToken | null = null;
    let bestGap = Number.POSITIVE_INFINITY;
    for (const t of tokens) {
      if (used.has(t)) continue;
      const g = gap(ms, me, t);
      if (g < bestGap && g <= MAX_GAP) {
        best = t;
        bestGap = g;
      }
    }
    if (best) used.add(best);

    return {
      index: r.index,
      text: r.text,
      start: r.start,
      end: r.endTime,
      hasRange: r.hasRange,
      rawZoneToken: best ? best.raw.trim() : null,
      zoneTokenIndex: best ? best.start : null,
    };
  });
}

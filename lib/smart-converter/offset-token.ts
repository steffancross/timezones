/**
 * Smart Converter — explicit numeric-offset parser.
 *
 * Handles the most common case in drop/preorder announcements: a literal UTC
 * offset like "GMT+8", "UTC−5", "+08:00", "GMT+5:30", "GMT-0930". A numeric
 * offset is NOT a named zone — it has no DST and no city — so we resolve it to
 * a fixed-offset Luxon zone rather than running it through `resolveZone`.
 *
 * Inputs reaching here are expected to be post-`normalize` (spacing collapsed,
 * sign glyphs ASCII-ified inside offset tokens), but we tolerate the raw forms
 * too so the parser is usable standalone.
 */

export interface ParsedOffset {
  /** Signed offset from UTC in minutes. "GMT+8" → 480, "UTC-5" → -300. */
  minutes: number;
  /** The token as matched, for echoing back. */
  raw: string;
}

// GMT/UTC ± H, H:MM or HHMM   |   bare ±H:MM or ±HHMM (must have a sign).
const GMT_RE = /^(?:GMT|UTC)\s*([+\-−])\s*(\d{1,2})(?::?(\d{2}))?$/i;
const BARE_RE = /^([+\-−])(\d{1,2}):?(\d{2})$/;

/** Global scanner form, for finding an offset inside a larger snippet. */
export const OFFSET_RE =
  /\b(?:GMT|UTC)\s*[+\-−]\s*\d{1,2}(?::?\d{2})?\b|(?<![\w:])[+\-−]\d{1,2}:\d{2}\b/gi;

function build(signChar: string, h: number, m: number, raw: string): ParsedOffset | null {
  if (h > 14 || m > 59) return null; // max real offset is +14:00
  const sign = signChar === '+' ? 1 : -1;
  return { minutes: sign * (h * 60 + m), raw };
}

/**
 * Parse a single offset token to signed minutes, or null if it isn't one.
 * Accepts the typographic minus (−, U+2212) as well as ASCII '-'.
 */
export function parseOffsetToken(token: string): ParsedOffset | null {
  const t = token.trim();
  if (!t) return null;

  const gmt = GMT_RE.exec(t);
  if (gmt) {
    const sign = gmt[1] === '+' ? '+' : '-';
    return build(sign, Number(gmt[2]), Number(gmt[3] ?? 0), t);
  }

  const bare = BARE_RE.exec(t);
  if (bare) {
    const sign = bare[1] === '+' ? '+' : '-';
    return build(sign, Number(bare[2]), Number(bare[3]), t);
  }

  return null;
}

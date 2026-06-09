/**
 * Smart Converter — text normalization (pipeline step 1).
 *
 * Cleans pasted text so the parser and offset matcher see consistent tokens:
 *   - en/em-dash and typographic minus → ASCII "-"  (so chrono detects ranges —
 *     it merges "Sep 24-27" but NOT "Sep 24–27", and reads "GMT-8" but not "GMT−8")
 *   - "gmt + 8" / "utc -  5"  → "GMT+8" / "UTC-5"  (collapse offset spacing)
 *   - stray emoji / pictographs → spaces
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INVARIANT: `normalize(s).length === s.length`.
 * ─────────────────────────────────────────────────────────────────────────────
 * Every transformation here is length-preserving (removed/rewritten runs are
 * back-filled with spaces). This is load-bearing: chrono matches against the
 * normalized text and reports character indices, and the paste box highlights
 * the ORIGINAL text at those indices. If normalization changed length, every
 * highlight would drift. A unit test asserts the invariant — do not add a
 * transform that shortens or lengthens the string.
 *
 */

// en-dash (U+2013), em-dash (U+2014), minus (U+2212), figure/horizontal bars.
const DASH_RE = /[‒–—―−]/g;

// Offset with spaces around the sign, e.g. "gmt + 8", "utc -  5:30".
const OFFSET_SPACING_RE = /\b(GMT|UTC)\s*([+-])\s*(\d{1,2}(?::?\d{2})?)/gi;

// Emoji / pictographs, plus zero-width joiner (U+200D) and variation selector
// (U+FE0F). An alternation (not a character class) because a class can't match
// the ZWJ-composed sequences these participate in.
const EMOJI_RE = /\p{Extended_Pictographic}|\u200D|\uFE0F/gu;

/** Replace a substring at [start, start+len) with `len` spaces. */
function blank(str: string, start: number, len: number): string {
  return str.slice(0, start) + ' '.repeat(len) + str.slice(start + len);
}

export function normalize(raw: string): string {
  let out = raw;

  // 0. Unify dashes to ASCII hyphen (1:1, length-preserving). Lets chrono detect
  //    date ranges ("Sep 24–27" → "Sep 24-27") and read negative offsets.
  out = out.replace(DASH_RE, '-');

  // 1. Collapse offset spacing into a canonical "GMT+8" token, ASCII sign.
  //    The reclaimed space is padded to the RIGHT, so the token stays anchored
  //    at the ORIGINAL start index — index mapping for the zone-token highlight
  //    then lines up with where the construct began in the raw text. (Most real
  //    offsets have no internal spaces, so there is no shift at all.)
  out = out.replace(OFFSET_SPACING_RE, (match, unit: string, sign: string, digits: string) => {
    const asciiSign = sign === '+' ? '+' : '-';
    const token = `${unit.toUpperCase()}${asciiSign}${digits}`;
    const pad = match.length - token.length;
    return token + ' '.repeat(Math.max(0, pad));
  });

  // 2. Strip emoji → spaces, blanking by the matched code-unit length so astral
  //    pictographs (surrogate pairs) stay length-preserving. Collect ranges from
  //    matchAll first, then blank by index (rewriting in place keeps positions).
  const ranges: Array<[number, number]> = [];
  for (const m of out.matchAll(EMOJI_RE)) {
    if (m.index != null) ranges.push([m.index, m[0].length]);
  }
  for (const [start, len] of ranges) {
    out = blank(out, start, len);
  }

  return out;
}

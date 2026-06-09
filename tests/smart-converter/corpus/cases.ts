/**
 * Smart Converter — chrono limits evaluation corpus.
 *
 * Realistic pasted announcements, the messy way people actually post them, each
 * tagged with what a HUMAN would extract. Driven by `scripts/eval-chrono.ts`
 * (`pnpm eval:chrono`) to characterize where the deterministic pipeline breaks
 * — and whether an LLM extraction fallback (spec §7) is warranted.
 *
 * This is NOT a pass/fail test suite: failures here are findings. Grow the corpus
 * as real inputs surface.
 *
 * Ground-truth instants are given (as UTC ISO) ONLY for cases with trivial,
 * DST-free arithmetic — explicit numeric offsets, where instant = wall − offset.
 * For named IANA zones we assert the zone CLASSIFICATION only (zoneKinds), to
 * avoid baking a hand-computed DST offset into the ground truth and lying to
 * ourselves. `null` in instantsUTC = "don't check the instant for this event".
 *
 * Reference instant for relative/forward-date resolution: Mon Jun 8 2026 16:00 UTC.
 */

export type ZoneKind = 'offset' | 'named' | 'ambiguous' | 'inherited' | 'target' | 'unknown';

export interface EvalExpect {
  /** How many distinct events a human reads from the text. */
  events: number;
  /** Expected zone classification per event, in source order. */
  zoneKinds?: ZoneKind[];
  /** Ground-truth start instant per event (UTC ISO), or null to skip the check. */
  instantsUTC?: (string | null)[];
}

export interface EvalCase {
  id: string;
  input: string;
  source_kind: string;
  expect: EvalExpect;
  note?: string;
}

/** Fixed reference for the whole corpus. Keep in sync with the harness. */
export const EVAL_REF = new Date(Date.UTC(2026, 5, 8, 16, 0, 0)); // Mon Jun 8 2026

export const CASES: EvalCase[] = [
  // ── Explicit offset (the bread-and-butter drop/preorder case) ──────────────
  {
    id: 'offset-preorder',
    input: 'Preorders start April 29 20:00 (GMT+8) 2026',
    source_kind: 'preorder',
    expect: { events: 1, zoneKinds: ['offset'], instantsUTC: ['2026-04-29T12:00:00.000Z'] },
  },
  {
    id: 'offset-spaced',
    input: 'drops april 29 8:00 pm gmt + 8',
    source_kind: 'drop',
    expect: { events: 1, zoneKinds: ['offset'], instantsUTC: ['2027-04-29T12:00:00.000Z'] },
    note: 'spaced offset; no year → next future occurrence',
  },
  {
    id: 'offset-utc-minus',
    input: 'Maintenance window 03:00 UTC-5 on Nov 2',
    source_kind: 'maintenance',
    expect: { events: 1, zoneKinds: ['offset'], instantsUTC: ['2026-11-02T08:00:00.000Z'] },
  },
  {
    id: 'offset-colon',
    input: 'Mint goes live 2026-09-01 at 14:30 +08:00',
    source_kind: 'crypto-mint',
    expect: { events: 1, zoneKinds: ['offset'], instantsUTC: ['2026-09-01T06:30:00.000Z'] },
  },
  {
    id: 'offset-half-hour',
    input: 'Webinar 9:00 AM GMT+5:30 on March 3',
    source_kind: 'webinar',
    expect: { events: 1, zoneKinds: ['offset'], instantsUTC: ['2027-03-03T03:30:00.000Z'] },
  },
  {
    id: 'offset-emoji-lead',
    input: '🎮 Preorders go live June 29 at 8:00 PM (GMT+8). 🚀',
    source_kind: 'game-launch',
    expect: { events: 1, zoneKinds: ['offset'], instantsUTC: ['2026-06-29T12:00:00.000Z'] },
  },

  // ── Multi-event (core requirement) ─────────────────────────────────────────
  {
    id: 'multi-two-offsets',
    input: 'Preorders June 29 8:00 PM (GMT+8) and second batch July 14 9:00 PM (GMT+8)',
    source_kind: 'preorder',
    expect: {
      events: 2,
      zoneKinds: ['offset', 'offset'],
      instantsUTC: ['2026-06-29T12:00:00.000Z', '2026-07-14T13:00:00.000Z'],
    },
  },
  {
    id: 'multi-inherited-zone',
    input: 'Batch 1 June 29 8pm GMT+8. Batch 2 June 30 9pm.',
    source_kind: 'drop',
    expect: {
      events: 2,
      zoneKinds: ['offset', 'offset'],
      instantsUTC: ['2026-06-29T12:00:00.000Z', '2026-06-30T13:00:00.000Z'],
    },
    note: 'rule 3: batch 2 inherits GMT+8',
  },

  // ── City / region phrases ──────────────────────────────────────────────────
  {
    id: 'city-beijing',
    input: 'Comeback stage 15:00 Beijing time on Aug 10',
    source_kind: 'kpop',
    expect: { events: 1, zoneKinds: ['named'], instantsUTC: ['2026-08-10T07:00:00.000Z'] },
  },
  {
    id: 'city-pacific',
    input: 'Sale ends midnight Pacific time Friday',
    source_kind: 'deadline',
    expect: { events: 1, zoneKinds: ['named'], instantsUTC: [null] },
    note: '"midnight … Friday" + Pacific; tests both date and city phrase',
  },
  {
    id: 'city-eastern',
    input: 'AMA at 3pm Eastern time tomorrow',
    source_kind: 'ama',
    expect: { events: 1, zoneKinds: ['named'], instantsUTC: [null] },
  },

  // ── Ambiguous abbreviations (must surface, never guess) ─────────────────────
  {
    id: 'ambig-cst',
    input: 'Live stream kicks off Fri 9:00 PM CST',
    source_kind: 'livestream',
    expect: { events: 1, zoneKinds: ['ambiguous'] },
  },
  {
    id: 'ambig-ist',
    input: 'Class starts 18:00 IST on Sep 5',
    source_kind: 'class',
    expect: { events: 1, zoneKinds: ['ambiguous'] },
    note: 'IST = India / Ireland / Israel',
  },

  // ── Unambiguous abbreviations ──────────────────────────────────────────────
  {
    id: 'abbr-jst',
    input: 'Episode premiere 25:00 JST (late night) Oct 1',
    source_kind: 'premiere',
    expect: { events: 1, zoneKinds: ['named'], instantsUTC: [null] },
    note: '25:00 = next-day 1am, common in JP listings — likely a chrono failure',
  },
  {
    id: 'abbr-pst',
    input: 'Q&A 8pm PST tonight',
    source_kind: 'qa',
    expect: { events: 1, zoneKinds: ['named'], instantsUTC: [null] },
  },

  // ── Relative references (rule 2) ───────────────────────────────────────────
  {
    id: 'rel-next-friday',
    input: 'Tickets drop next friday 8pm EST',
    source_kind: 'tickets',
    expect: { events: 1, zoneKinds: ['named'], instantsUTC: [null] },
  },
  {
    id: 'rel-this-sunday',
    input: 'Match kicks off this Sunday 20:00 BST',
    source_kind: 'sports',
    expect: { events: 1, zoneKinds: ['ambiguous'] },
    note: 'BST = British Summer / Bangladesh Std — collision group',
  },
  {
    id: 'rel-tonight',
    input: 'Server goes down tonight at 11pm',
    source_kind: 'maintenance',
    expect: { events: 1, zoneKinds: ['target'], instantsUTC: [null] },
    note: 'bare time, no zone → assumed target (rule 1)',
  },

  // ── Ranges (rule 4) ────────────────────────────────────────────────────────
  {
    id: 'range-endash',
    input: 'Pop-up runs Sep 24–27 (GMT+8)',
    source_kind: 'popup',
    expect: { events: 1, zoneKinds: ['offset'], instantsUTC: [null] },
    note: 'en-dash range; normalize must convert to hyphen for chrono',
  },
  {
    id: 'range-to',
    input: 'Voting open Nov 1 to Nov 5, 23:59 GMT+0',
    source_kind: 'voting',
    expect: { events: 1, zoneKinds: ['offset'], instantsUTC: [null] },
  },

  // ── Bare time / no zone ────────────────────────────────────────────────────
  {
    id: 'bare-8pm',
    input: 'drops at 8pm',
    source_kind: 'drop',
    expect: { events: 1, zoneKinds: ['target'], instantsUTC: [null] },
  },
  {
    id: 'bare-noon',
    input: 'Restock at noon sharp on July 4',
    source_kind: 'restock',
    expect: { events: 1, zoneKinds: ['target'], instantsUTC: [null] },
  },
  {
    id: 'bare-eod',
    input: 'Submissions due EOD Friday',
    source_kind: 'deadline',
    expect: { events: 1, zoneKinds: ['target'], instantsUTC: [null] },
    note: '"EOD" is not a clock time — likely missed or date-only',
  },

  // ── Numeric / locale date formats ──────────────────────────────────────────
  {
    id: 'fmt-slash-us',
    input: 'Launch 09/15/2026 7:00 PM EDT',
    source_kind: 'launch',
    expect: { events: 1, zoneKinds: ['named'], instantsUTC: [null] },
  },
  {
    id: 'fmt-slash-eu',
    input: 'Kickoff 15/09/2026 19:00 CET',
    source_kind: 'sports',
    expect: { events: 1, zoneKinds: ['named'], instantsUTC: [null] },
    note: 'DD/MM ordering — chrono casual defaults can mis-read this',
  },
  {
    id: 'fmt-ordinal',
    input: 'Drop on April 29th at 8 PM GMT+8',
    source_kind: 'drop',
    expect: { events: 1, zoneKinds: ['offset'], instantsUTC: ['2027-04-29T12:00:00.000Z'] },
  },

  // ── Genuinely unparseable (correct to punt) ────────────────────────────────
  {
    id: 'unparseable-sundown',
    input: "we'll open the vault at sundown ✨ stay tuned",
    source_kind: 'vague',
    expect: { events: 0 },
    note: 'no date/clock/zone → unknown is correct',
  },
  {
    id: 'unparseable-soon',
    input: 'dropping soon, stay locked in 🔒',
    source_kind: 'vague',
    expect: { events: 0 },
  },

  // ── Awkward but real phrasings ─────────────────────────────────────────────
  {
    id: 'awkward-zone-in-prose',
    input: 'All times are GMT+8. The drop is April 29 at 8pm.',
    source_kind: 'drop',
    expect: { events: 1, zoneKinds: ['offset'], instantsUTC: ['2027-04-29T12:00:00.000Z'] },
    note: 'zone stated in a separate sentence — hard for the trailing-window scan',
  },
  {
    id: 'awkward-ish',
    input: 'goes live around 8pm-ish PT Saturday',
    source_kind: 'livestream',
    expect: { events: 1, zoneKinds: ['named'], instantsUTC: [null] },
    note: '"8pm-ish" — fuzzy time',
  },
  {
    id: 'awkward-24h-no-meridiem',
    input: 'Patch deploys 1400 GMT+1 on Monday',
    source_kind: 'maintenance',
    expect: { events: 1, zoneKinds: ['offset'], instantsUTC: [null] },
    note: 'military "1400" with no colon',
  },

  // ── More real source kinds & phrasings ─────────────────────────────────────
  {
    id: 'sneaker-drop',
    input: 'SNKRS drop 10:00 AM EDT on 06/20/2026 🔥',
    source_kind: 'sneaker',
    expect: { events: 1, zoneKinds: ['named'], instantsUTC: [null] },
  },
  {
    id: 'concert-onsale',
    input: 'Tickets on sale Friday 10am local — wait, 10am BST',
    source_kind: 'concert',
    expect: { events: 1, zoneKinds: ['ambiguous'] },
    note: 'BST collision; "local" then a correction',
  },
  {
    id: 'discord-event',
    input: 'Community call <t:1782931200> — see you there',
    source_kind: 'discord',
    expect: { events: 0 },
    note: "Discord epoch timestamp token — chrono can't read it; should punt",
  },
  {
    id: 'nft-mint-utc',
    input: 'Public mint opens 16:00 UTC March 12 2027',
    source_kind: 'nft',
    expect: { events: 1, zoneKinds: ['named'], instantsUTC: ['2027-03-12T16:00:00.000Z'] },
    note: 'bare UTC → named UTC zone; 24h time before bare date needs drop-recovery',
  },
  {
    id: 'deadline-midnight-pt',
    input: 'Offer ends 11:59 PM PT on June 30',
    source_kind: 'deadline',
    expect: { events: 1, zoneKinds: ['named'], instantsUTC: [null] },
  },
  {
    id: 'esports-match',
    input: 'Grand finals Aug 22 at 18:00 KST',
    source_kind: 'esports',
    expect: { events: 1, zoneKinds: ['named'], instantsUTC: [null] },
  },
  {
    id: 'webinar-tmrw',
    input: 'Reminder: onboarding call tmrw 9am CET',
    source_kind: 'webinar',
    expect: { events: 1, zoneKinds: ['named'], instantsUTC: [null] },
    note: '"tmrw" abbreviation',
  },
  {
    id: 'relative-in-hours',
    input: 'Stream starts in 3 hours',
    source_kind: 'livestream',
    expect: { events: 1, zoneKinds: ['target'], instantsUTC: [null] },
    note: 'relative duration; converts against now in target zone',
  },

  // ── Re-merge candidates (time + date split by filler) ──────────────────────
  {
    id: 'split-noon-sharp',
    input: 'Restock at noon sharp on July 4 GMT+8',
    source_kind: 'restock',
    expect: { events: 1, zoneKinds: ['offset'], instantsUTC: ['2026-07-04T04:00:00.000Z'] },
    note: '"sharp" splits time from date — re-merge target',
  },
  {
    id: 'split-ish',
    input: 'goes live around 8pm-ish Saturday PT',
    source_kind: 'livestream',
    expect: { events: 1, zoneKinds: ['named'], instantsUTC: [null] },
    note: '"-ish" splits time from date — re-merge target',
  },

  // ── Must NOT merge (genuinely separate events across a sentence) ────────────
  {
    id: 'two-sentences',
    input: 'Doors open 7pm GMT+8. The show is on Aug 5.',
    source_kind: 'concert',
    expect: { events: 2, zoneKinds: ['offset', 'offset'], instantsUTC: [null, null] },
    note: 'period between → must stay two events; guards the re-merge',
  },

  // ── Lowercase zone abbreviations (casual typing) ───────────────────────────
  {
    id: 'lower-cet',
    input: 'july 22 09:00 cet',
    source_kind: 'maintenance',
    expect: { events: 1, zoneKinds: ['named'], instantsUTC: ['2026-07-22T07:00:00.000Z'] },
    note: "user-reported: lowercase 'cet' was being ignored (now fixed)",
  },
  {
    id: 'military-0900',
    input: 'july 22 0900 cet',
    source_kind: 'maintenance',
    expect: { events: 1, zoneKinds: ['named'], instantsUTC: [null] },
    note: 'KNOWN LIMIT: bare 4-digit "0900" not parsed (collides with years); shows date as all-day. Document: use 09:00 / 9am.',
  },
  {
    id: 'lower-pst',
    input: 'drop is 8pm pst tonight',
    source_kind: 'drop',
    expect: { events: 1, zoneKinds: ['named'], instantsUTC: [null] },
  },
  {
    id: 'lower-gmt-offset',
    input: 'mint 14:00 gmt+8 on aug 3',
    source_kind: 'nft',
    expect: { events: 1, zoneKinds: ['offset'], instantsUTC: ['2026-08-03T06:00:00.000Z'] },
  },
  // Collision guard: common words that are also abbreviations must NOT be read as
  // zones in lowercase → fall back to assumed target, never a silent wrong zone.
  {
    id: 'collide-cat',
    input: 'feed the cat at 8pm',
    source_kind: 'noise',
    expect: { events: 1, zoneKinds: ['target'], instantsUTC: [null] },
    note: '"cat" lowercase must not mean Central Africa Time',
  },
  {
    id: 'collide-eat',
    input: 'we eat at noon on July 4',
    source_kind: 'noise',
    expect: { events: 1, zoneKinds: ['target'], instantsUTC: [null] },
  },
  {
    id: 'collide-cat-caps',
    input: 'broadcast 9pm CAT on Sep 1',
    source_kind: 'broadcast',
    expect: { events: 1, zoneKinds: ['named'], instantsUTC: [null] },
    note: 'all-caps CAT IS intentional → Central Africa Time',
  },

  // ── Unknown / punt path (the "we can\'t figure it out" UX) ──────────────────
  {
    id: 'unknown-tba',
    input: 'Release date: TBA. Stay tuned!',
    source_kind: 'vague',
    expect: { events: 0 },
  },
  {
    id: 'unknown-when-ready',
    input: "it's done when it's done 🤷",
    source_kind: 'vague',
    expect: { events: 0 },
  },
  {
    id: 'unknown-soon-tm',
    input: 'Coming Soon™',
    source_kind: 'vague',
    expect: { events: 0 },
  },
];

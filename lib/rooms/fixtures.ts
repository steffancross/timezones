// Fixture RoomState for the Availability Room (spec 3 deliverable). Specs 4 (Team)
// and 6 (Overview) build against this until spec 5's real write path exists.
//
// Built for a canonical viewer (FIXTURE_VIEWER_TZ) looking at FIXTURE_WEEK_ANCHOR
// with the clock at FIXTURE_NOW. Availability is declared in ABSOLUTE UTC windows
// and filled into each participant's own-zone blob via `setUtc`, so cross-zone
// overlap is correct by construction (no hand-aligned slot math). The week is in
// January — no DST transitions for any zone involved, so each recurring template
// reproduces the same absolute windows when projected back onto this week.
//
// What it exercises:
//   - 4 responders across 4 zones incl. far-flung Asia/Tokyo (the smear).
//   - 1 unresponded participant (Priya) → "hasn't filled" + excluded from compute.
//   - Sam has a concrete override differing from his template (override projection
//     + the liveStatus `inferred=false` path at FIXTURE_NOW).
//   - Monday: an ALL-GREEN window (09:00–11:00 NY). Tuesday: a SOME window
//     (09:00–10:00 NY, Sam if-needed). Sunday (= "today" at FIXTURE_NOW): NO full
//     overlap → todayWindows() is [] (exercises the empty-today copy).

import { DateTime } from '@/lib/time/luxon';
import {
  blobDow,
  emptyWeek,
  parseDay,
  parseWeek,
  serializeDay,
  serializeWeek,
  type SlotState,
} from './blob';
import { SLOTS_PER_DAY } from './config';
import type { PublicParticipant, RoomState } from './db';

export const FIXTURE_VIEWER_TZ = 'America/New_York';
export const FIXTURE_WEEK_ANCHOR = '2026-01-04'; // a Sunday
export const FIXTURE_NOW = DateTime.fromISO('2026-01-04T12:00:00', { zone: 'UTC' }).toMillis();

const MON = '2026-01-05';
const TUE = '2026-01-06';

/** Fill the half-hour slots of `[utcStart, utcEnd)` into a participant's own-zone week blob. */
function setUtc(
  week: SlotState[],
  tz: string,
  utcStartIso: string,
  utcEndIso: string,
  state: SlotState,
): void {
  let cur = DateTime.fromISO(utcStartIso, { zone: 'UTC' });
  const end = DateTime.fromISO(utcEndIso, { zone: 'UTC' });
  while (cur < end) {
    const local = cur.setZone(tz);
    const idx =
      blobDow(local.weekday) * SLOTS_PER_DAY + local.hour * 2 + (local.minute >= 30 ? 1 : 0);
    week[idx] = state;
    cur = cur.plus({ minutes: 30 });
  }
}

/** Build a responder's general-week blob from a list of absolute-UTC availability windows. */
function week(tz: string, windows: { start: string; end: string; state: SlotState }[]): string {
  const slots = parseWeek(emptyWeek());
  for (const w of windows) setUtc(slots, tz, w.start, w.end, w.state);
  return serializeWeek(slots);
}

/** Sam's override: on his LA Sunday (the FIXTURE_NOW date), mark 04:00 PST available. */
function samOverrideDay(): string {
  const day = parseDay('n'.repeat(SLOTS_PER_DAY));
  day[4 * 2] = 'y'; // 04:00 → slot 8; covers FIXTURE_NOW for Sam → liveStatus inferred=false
  return serializeDay(day);
}

const responder = (
  id: string,
  displayName: string,
  timezone: string,
  generalWeek: string,
  overrides: Record<string, string> = {},
): PublicParticipant => ({
  id,
  displayName,
  timezone,
  generalWeek,
  overrides,
  hasResponded: true,
  hasPassword: false,
});

const MON_ALL = { start: `${MON}T14:00:00`, end: `${MON}T16:00:00`, state: 'y' as const };
const TUE_SOME = { start: `${TUE}T14:00:00`, end: `${TUE}T15:00:00`, state: 'y' as const };

const participants: PublicParticipant[] = [
  responder('maya', 'Maya', 'America/New_York', week('America/New_York', [MON_ALL, TUE_SOME])),
  responder('theo', 'Theo', 'Europe/London', week('Europe/London', [MON_ALL, TUE_SOME])),
  responder('yuki', 'Yuki', 'Asia/Tokyo', week('Asia/Tokyo', [MON_ALL, TUE_SOME])),
  // Sam is all-in Monday but only "if needed" Tuesday → Tuesday grades to `some`.
  responder(
    'sam',
    'Sam',
    'America/Los_Angeles',
    week('America/Los_Angeles', [MON_ALL, { ...TUE_SOME, state: 's' }]),
    { [FIXTURE_WEEK_ANCHOR]: samOverrideDay() },
  ),
  // Priya never filled in availability.
  {
    id: 'priya',
    displayName: 'Priya',
    timezone: 'Asia/Kolkata',
    generalWeek: null,
    overrides: {},
    hasResponded: false,
    hasPassword: false,
  },
];

/** The canonical fixture room — import in specs 4/6 with FIXTURE_VIEWER_TZ / _WEEK_ANCHOR / _NOW. */
export const FIXTURE_ROOM: RoomState = {
  room: { id: 'fixture-room', name: 'Lake trip planning', schemaVersion: 1 },
  participants,
};

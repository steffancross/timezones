// Example room fixture — used only by /r/example (the public demo).
// Independent from lib/rooms/fixtures.ts (which is wired to unit tests).
//
// Five people: two in ET (the "pair"), one CT, one PT, one London.
// generalWeek blobs are in each person's LOCAL time; no overrides.
// Ranges are applied in order — later entries overwrite earlier ones,
// which is how per-day exceptions punch holes in the base schedule.

import type { PublicParticipant, RoomState } from './db';

type SlotState = 'n' | 'y' | 's';

// Build a 336-char generalWeek blob from local-time ranges.
// day: 0=Sun, 1=Mon … 6=Sat; start/end: fractional hours (8.5 = 8:30 am).
function makeWeek(
  ranges: { day: number | number[]; start: number; end: number; state?: SlotState }[],
): string {
  const slots = new Array<SlotState>(336).fill('n');
  for (const r of ranges) {
    const days = Array.isArray(r.day) ? r.day : [r.day];
    const state = r.state ?? 'y';
    for (const day of days) {
      for (let s = Math.round(r.start * 2); s < Math.round(r.end * 2); s++) {
        slots[day * 48 + s] = state;
      }
    }
  }
  return slots.join('');
}

const MON = 1,
  TUE = 2,
  WED = 3,
  THU = 4,
  FRI = 5;
const WORKDAYS = [MON, TUE, WED, THU, FRI];

function participant(
  id: string,
  displayName: string,
  timezone: string,
  generalWeek: string,
): PublicParticipant {
  return {
    id,
    displayName,
    timezone,
    generalWeek,
    overrides: {},
    hasResponded: true,
    hasPassword: false,
  };
}

// Alex — New York. Core hours 9–5.
// Soft edges: 8–9 am and 5–6 pm Mon–Thu (can flex if needed).
// Lunch 12–1 is soft rather than hard-blocked — available at desk but prefers not.
// Hard blocks: Tue 11–12 (recurring 1:1), Thu 2–3 (sprint review).
const alex = participant(
  'alex',
  'Alex',
  'America/New_York',
  makeWeek([
    { day: WORKDAYS, start: 8, end: 9, state: 's' },
    { day: WORKDAYS, start: 9, end: 12 },
    { day: WORKDAYS, start: 12, end: 13, state: 's' },
    { day: WORKDAYS, start: 13, end: 17 },
    { day: [MON, TUE, WED, THU], start: 17, end: 18, state: 's' },
    { day: [TUE], start: 11, end: 12, state: 'n' },
    { day: [THU], start: 14, end: 15, state: 'n' },
  ]),
);

// Maya — New York (shares ET with Alex). Earlier start: 8:30 am, runs to 5:30.
// Soft: 8–8:30 am and 5:30–6:30 pm. Lunch 12–1 soft.
// Hard blocks: Mon 9–10 (all-hands), Wed 3–4 (design review).
const maya = participant(
  'maya',
  'Maya',
  'America/New_York',
  makeWeek([
    { day: WORKDAYS, start: 8, end: 8.5, state: 's' },
    { day: WORKDAYS, start: 8.5, end: 12 },
    { day: WORKDAYS, start: 12, end: 13, state: 's' },
    { day: WORKDAYS, start: 13, end: 17.5 },
    { day: [MON, TUE, WED, THU], start: 17.5, end: 18.5, state: 's' },
    { day: [MON], start: 9, end: 10, state: 'n' },
    { day: [WED], start: 15, end: 16, state: 'n' },
  ]),
);

// Jordan — Chicago (CT = ET − 1 h). Standard 9–5, clean schedule.
// Soft: 8–9 am (early cross-tz calls), lunch 12–1, and 5–6 pm Mon–Thu.
const jordan = participant(
  'jordan',
  'Jordan',
  'America/Chicago',
  makeWeek([
    { day: WORKDAYS, start: 8, end: 9, state: 's' },
    { day: WORKDAYS, start: 9, end: 12 },
    { day: WORKDAYS, start: 12, end: 13, state: 's' },
    { day: WORKDAYS, start: 13, end: 17 },
    { day: [MON, TUE, WED, THU], start: 17, end: 18, state: 's' },
  ]),
);

// Sam — Los Angeles (PT = ET − 3 h). Early starter: on from 7:30 am for ET overlap.
// Soft: 7:30–8 am, lunch 12–1, and evenings Mon–Thu.
// Wed 10–11 soft (standup but can flex). Friday wraps at 3 pm.
const sam = participant(
  'sam',
  'Sam',
  'America/Los_Angeles',
  makeWeek([
    { day: WORKDAYS, start: 7.5, end: 8, state: 's' },
    { day: WORKDAYS, start: 8, end: 12 },
    { day: WORKDAYS, start: 12, end: 13, state: 's' },
    { day: WORKDAYS, start: 13, end: 17 },
    { day: [MON, TUE, WED, THU], start: 17, end: 18.5, state: 's' },
    { day: [WED], start: 10, end: 11, state: 's' },
    { day: [FRI], start: 15, end: 17, state: 'n' },
  ]),
);

// Priya — London (GMT/BST = ET + 5 h). Long day: 9 am–7 pm with a real lunch.
// Soft: 8–9 am (before official hours), 1–2 pm lunch, 7–8 pm (wrapping up).
// Hard blocks: Tue 5–7 pm (team social), Thu 3:30–5:30 pm (stakeholder call).
const priya = participant(
  'priya',
  'Priya',
  'Europe/London',
  makeWeek([
    { day: WORKDAYS, start: 8, end: 9, state: 's' },
    { day: WORKDAYS, start: 9, end: 13 },
    { day: WORKDAYS, start: 13, end: 14, state: 's' },
    { day: WORKDAYS, start: 14, end: 19 },
    { day: [MON, WED, FRI], start: 19, end: 20, state: 's' },
    { day: [TUE], start: 17, end: 19, state: 'n' },
    { day: [THU], start: 15.5, end: 17.5, state: 'n' },
  ]),
);

export const EXAMPLE_ROOM: RoomState = {
  room: { id: 'example', name: 'Weekly team sync', schemaVersion: 1 },
  participants: [alex, maya, jordan, sam, priya],
};

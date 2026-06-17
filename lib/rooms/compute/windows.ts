// Meeting-window ranking (spec 3, Overview). A window is, within a SINGLE viewer
// day, a maximal run of consecutive cells whose grade != 'none' (everyone-in
// throughout) — contiguous cells are merged, so "3–5 PM", never "3–4 + 4–5".
// The contiguous-run grouping mirrors computeBusinessOverlap (lib/time/working-
// hours.ts); the data model differs (N participants × half-hour grid).
//
// Ranking — "as many ideal as exist, then fall back": all-green tier first
// (longer-first within it); then the some tier (kindest = fewest distinct soft
// people first, then longer). Stable tiebreak = earliest start. Cap MAX_WINDOWS.

import { DateTime } from '@/lib/time/luxon';
import { MAX_WINDOWS, SLOTS_PER_DAY } from '../config';
import { aggregate } from './aggregate';
import { cellInstant, viewerWeekStart } from './cells';
import { project } from './projection';
import type { ComputeInput, Grade, MeetingWindow, Projection } from './types';

const HALF_HOUR_MS = 30 * 60 * 1000;

type Prepared = {
  weekStart: DateTime;
  grade: Grade[][];
  projection: Projection;
  now: number;
};

function prepare(input: ComputeInput): Prepared {
  const projection = project(input);
  const { grade } = aggregate(projection);
  return {
    weekStart: viewerWeekStart(input.weekAnchor, input.viewerTz),
    grade,
    projection,
    now: input.now,
  };
}

const gradeAt = (grade: Grade[][], d: number, k: number): Grade => grade[d]?.[k] ?? 'none';
const windowLength = (w: MeetingWindow): number => w.endSlot - w.startSlot + 1;

/** Build a window over [startSlot, endSlot] on day d, after any past-truncation. */
function buildWindow(p: Prepared, d: number, startSlot: number, endSlot: number): MeetingWindow {
  let allGreen = true;
  const soft = new Set<string>();
  for (let k = startSlot; k <= endSlot; k++) {
    if (gradeAt(p.grade, d, k) !== 'all') allGreen = false;
    for (const part of p.projection.participants) {
      if ((part.grid[d]?.[k] ?? 'n') === 's') soft.add(part.participantId);
    }
  }
  const startInstant = cellInstant(p.weekStart, d, startSlot).millis;
  const endInstant = cellInstant(p.weekStart, d, endSlot).millis + HALF_HOUR_MS;
  return {
    day: d,
    startSlot,
    endSlot,
    grade: allGreen ? 'all' : 'some',
    softPeople: [...soft],
    startInstant,
    endInstant,
  };
}

/** All windows on one viewer day, past-filtered (dropped if fully past, start-truncated if straddling). */
function dayWindows(p: Prepared, d: number): MeetingWindow[] {
  const windows: MeetingWindow[] = [];
  let k = 0;
  while (k < SLOTS_PER_DAY) {
    if (gradeAt(p.grade, d, k) === 'none') {
      k++;
      continue;
    }
    let e = k;
    while (e + 1 < SLOTS_PER_DAY && gradeAt(p.grade, d, e + 1) !== 'none') e++;

    // Past-filter this [k, e] run.
    const endInstant = cellInstant(p.weekStart, d, e).millis + HALF_HOUR_MS;
    if (endInstant > p.now) {
      // Truncate the start up to the slot still containing/after `now`.
      let s = k;
      while (s <= e && cellInstant(p.weekStart, d, s).millis + HALF_HOUR_MS <= p.now) s++;
      if (s <= e) windows.push(buildWindow(p, d, s, e));
    }
    k = e + 1;
  }
  return windows;
}

/** Greenest→longest, then kindest→longest within the soft tier; stable on earliest start. */
function rankWindows(a: MeetingWindow, b: MeetingWindow): number {
  const tier = (w: MeetingWindow) => (w.grade === 'all' ? 0 : 1);
  if (tier(a) !== tier(b)) return tier(a) - tier(b);
  if (tier(a) === 1 && a.softPeople.length !== b.softPeople.length) {
    return a.softPeople.length - b.softPeople.length; // fewer soft = kinder
  }
  const la = windowLength(a);
  const lb = windowLength(b);
  if (la !== lb) return lb - la; // longer first
  return a.startInstant - b.startInstant; // stable tiebreak
}

function allWindows(p: Prepared): MeetingWindow[] {
  const out: MeetingWindow[] = [];
  for (let d = 0; d < p.grade.length; d++) out.push(...dayWindows(p, d));
  return out;
}

/** Best up-to-MAX_WINDOWS meeting windows across the viewed week (future portion only). */
export function weekWindows(input: ComputeInput): MeetingWindow[] {
  const p = prepare(input);
  return allWindows(p).sort(rankWindows).slice(0, MAX_WINDOWS);
}

/** Windows within the viewer's current calendar day, future portion only ([] when none/used up). */
export function todayWindows(input: ComputeInput): MeetingWindow[] {
  const p = prepare(input);
  const todayDate = DateTime.fromMillis(p.now).setZone(input.viewerTz).toISODate();

  let todayIndex = -1;
  for (let d = 0; d < p.grade.length; d++) {
    if (p.weekStart.plus({ days: d }).toISODate() === todayDate) {
      todayIndex = d;
      break;
    }
  }
  if (todayIndex === -1) return []; // the viewed week isn't the current week

  return dayWindows(p, todayIndex).sort(rankWindows).slice(0, MAX_WINDOWS);
}

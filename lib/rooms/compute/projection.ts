// Projection — the correctness-critical core (spec 3). For a viewer looking at a
// concrete week, resolve each compute-set participant's state at every cell of
// the viewer's 7×48 grid, plus the viewer-cell "nonexistent" (spring-forward)
// flags. Resolves the timezone smear by construction: each cell becomes an
// absolute instant, then that instant is read in the participant's OWN zone —
// so cross-midnight / cross-day / odd-offset cases all just work.

import { parseDay, parseWeek, type SlotState } from '../blob';
import { SLOTS_PER_DAY } from '../config';
import type { PublicParticipant } from '../db';
import { cellInstant, participantSlotAt, viewerWeekStart } from './cells';
import { makeGrid } from './grid';
import type { ComputeInput, ParticipantProjection, Projection } from './types';

/** The compute set: selected ∩ responders. Unresponded participants are excluded entirely. */
export function computeSet(input: ComputeInput): PublicParticipant[] {
  const selected = input.selected;
  return input.room.participants.filter(
    (p) => p.hasResponded && (selected === undefined || selected.includes(p.id)),
  );
}

/** A participant's pre-parsed blobs, so the per-cell loop is pure indexing. */
export type ParsedParticipant = {
  id: string;
  timezone: string;
  template: SlotState[] | null; // 336 slots, or null if generalWeek unset
  overrides: Map<string, SlotState[]>; // localDate → 48 slots
};

export function parseParticipant(p: PublicParticipant): ParsedParticipant {
  const overrides = new Map<string, SlotState[]>();
  for (const [date, day] of Object.entries(p.overrides)) {
    overrides.set(date, parseDay(day));
  }
  return {
    id: p.id,
    timezone: p.timezone,
    template: p.generalWeek === null ? null : parseWeek(p.generalWeek),
    overrides,
  };
}

/**
 * Resolve one participant's state at an instant. `inferred` = true when it came
 * from the recurring template rather than a concrete override for that local
 * date (i.e. "probably free" vs "said they're free" — drives liveStatus).
 */
export function resolveState(
  parsed: ParsedParticipant,
  millis: number,
): { state: SlotState; inferred: boolean } {
  const { localDate, dow, halfHour } = participantSlotAt(millis, parsed.timezone);
  const override = parsed.overrides.get(localDate);
  if (override) return { state: override[halfHour] ?? 'n', inferred: false };
  if (!parsed.template) return { state: 'n', inferred: true }; // overrides-only responder
  return { state: parsed.template[dow * SLOTS_PER_DAY + halfHour] ?? 'n', inferred: true };
}

function stateAt(parsed: ParsedParticipant, millis: number): SlotState {
  return resolveState(parsed, millis).state;
}

/**
 * Project the whole compute set into the viewer's grid. `nonexistent` is shared
 * across participants (it's a property of the viewer cell's instant), so we
 * compute the per-cell instants once and reuse them for every participant.
 */
export function project(input: ComputeInput): Projection {
  const weekStart = viewerWeekStart(input.weekAnchor, input.viewerTz);

  // One pass: per-cell instant + gap flag, independent of participants.
  const cells = makeGrid((d, k) => cellInstant(weekStart, d, k));
  const nonexistent = cells.map((row) => row.map((c) => c.nonexistent));

  const participants: ParticipantProjection[] = computeSet(input).map((p) => {
    const parsed = parseParticipant(p);
    // Map over the precomputed cells directly — no re-indexing, no undefined.
    const grid = cells.map((row) => row.map((c) => stateAt(parsed, c.millis)));
    return { participantId: parsed.id, grid };
  });

  return { participants, nonexistent };
}

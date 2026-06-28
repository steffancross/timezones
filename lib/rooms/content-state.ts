// Cold-start content phase (spec 7b). A room's Team/Overview surface depends on
// how many people have actually *responded* — not how many named themselves. A
// named-but-unpainted participant doesn't populate the room (matching the engine
// rule that the aggregate ignores unresponded people). Single source so Team and
// Overview can't drift on the empty/solo/group boundary.

import type { PublicParticipant } from './db';

export type ContentPhase = 'empty' | 'solo' | 'group';

/** The people whose availability actually counts (have saved at least once). */
export function respondedParticipants(participants: PublicParticipant[]): PublicParticipant[] {
  return participants.filter((p) => p.hasResponded);
}

/**
 * empty (0 responders) → get-started; solo (1) → single-person view, never an
 * all-green "consensus"; group (2+) → the normal aggregate.
 */
export function contentPhase(participants: PublicParticipant[]): ContentPhase {
  const n = respondedParticipants(participants).length;
  return n === 0 ? 'empty' : n === 1 ? 'solo' : 'group';
}

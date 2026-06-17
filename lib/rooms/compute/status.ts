// Live "right now" status (spec 3). Each responder's projected state at `now`, in
// their own zone, with `inferred` marking template-derived ("probably free") vs
// override-derived ("said they're free"). Unresponded participants are omitted —
// there's no honest status to show. Not filtered by `selected`: this is everyone's
// current status for the roster, independent of the aggregate selection.

import type { ComputeInput, LiveStatus } from './types';
import { parseParticipant, resolveState } from './projection';

export function liveStatus(input: ComputeInput): LiveStatus[] {
  return input.room.participants
    .filter((p) => p.hasResponded)
    .map((p) => {
      const { state, inferred } = resolveState(parseParticipant(p), input.now);
      return { participantId: p.id, state, inferred };
    });
}

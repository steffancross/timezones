// Aggregate overlap grid (spec 3). Collapses the per-participant projections into
// a single grade per viewer cell over the compute set. Non-existent (spring-
// forward) cells can't be a meeting time, so they're forced to 'none' — the flag
// itself rides along in AggregateGrid for the view's sliver.

import type { SlotState } from '../blob';
import type { AggregateGrid, Grade, Projection } from './types';

/**
 * Grade one cell from the responders' states:
 *   any 'n' → none (a responder is out) · all 'y' → all · mixed y/s (no n) → some
 *   · empty set → none.
 */
export function cellGrade(states: SlotState[]): Grade {
  if (states.length === 0) return 'none';
  let allY = true;
  for (const s of states) {
    if (s === 'n') return 'none';
    if (s !== 'y') allY = false; // an 'if-needed' → soft
  }
  return allY ? 'all' : 'some';
}

/** Build the aggregate grade grid (+ passthrough nonexistent flags) from a projection. */
export function aggregate(projection: Projection): AggregateGrid {
  const grade: Grade[][] = projection.nonexistent.map((row, d) =>
    row.map((isGap, k) => {
      if (isGap) return 'none';
      const states = projection.participants.map((p) => p.grid[d]?.[k] ?? 'n');
      return cellGrade(states);
    }),
  );
  return { grade, nonexistent: projection.nonexistent };
}

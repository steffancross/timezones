// Collapse segmentation (spec 3). A viewer time-row k is "dead" if no compute-set
// member is available/if-needed at slot k on ANY of the 7 days (grade 'none'
// everywhere — non-existent cells already read as 'none'). Maximal dead runs of
// FOLD_MIN+ fold; shorter interior holes stay visible (they're information). The
// folds can fall anywhere — top, bottom, or interior (the old bug was top-only).
// The engine just returns the segments; the compress/expand control decides
// whether folds render collapsed.

import { FOLD_MIN, SLOTS_PER_DAY } from '../config';
import type { Grade, Segment } from './types';

/** Partition the 48 time-rows into folded (dead run ≥ FOLD_MIN) and visible spans. */
export function rowSegments(grid: Grade[][]): Segment[] {
  // A row is dead when every day is 'none' at that slot.
  const dead = Array.from({ length: SLOTS_PER_DAY }, (_, k) =>
    grid.every((row) => (row[k] ?? 'none') === 'none'),
  );

  // Mark only the cells inside a long-enough dead run as foldable.
  const fold = new Array<boolean>(SLOTS_PER_DAY).fill(false);
  let k = 0;
  while (k < SLOTS_PER_DAY) {
    if (!dead[k]) {
      k++;
      continue;
    }
    let j = k;
    while (j < SLOTS_PER_DAY && dead[j]) j++;
    if (j - k >= FOLD_MIN) {
      for (let i = k; i < j; i++) fold[i] = true;
    }
    k = j;
  }

  // Coalesce consecutive equal-fold cells into segments.
  const segments: Segment[] = [];
  let start = 0;
  for (let i = 1; i <= SLOTS_PER_DAY; i++) {
    if (i === SLOTS_PER_DAY || fold[i] !== fold[start]) {
      segments.push({ fold: !!fold[start], from: start, to: i - 1 });
      start = i;
    }
  }
  return segments;
}

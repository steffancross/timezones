// Collapse segmentation (spec 3). A viewer time-row k is "dead" if no compute-set
// member is available/if-needed at slot k on ANY of the 7 days (grade 'none'
// everywhere — non-existent cells already read as 'none'). Maximal dead runs of
// FOLD_MIN+ fold; shorter interior holes stay visible (they're information). The
// folds can fall anywhere — top, bottom, or interior (the old bug was top-only).
// The engine just returns the segments; the compress/expand control decides
// whether folds render collapsed.

import { FOLD_MIN, FOLD_PAD, SLOTS_PER_DAY } from '../config';
import type { Grade, Segment } from './types';

/** Partition the 48 time-rows into folded (dead run ≥ FOLD_MIN) and visible spans. */
export function rowSegments(grid: Grade[][]): Segment[] {
  // A row is dead when every day is 'none' at that slot.
  const dead = Array.from({ length: SLOTS_PER_DAY }, (_, k) =>
    grid.every((row) => (row[k] ?? 'none') === 'none'),
  );

  // Mark foldable cells. A maximal dead run [k, j-1] keeps FOLD_PAD slots of
  // breathing room visible on any side that borders a live region (the run is
  // maximal, so k-1 / j are live when not at the grid edge). Only the interior
  // beyond that padding folds, and only if it's still ≥ FOLD_MIN — so a fold
  // never hugs an availability window.
  const fold = new Array<boolean>(SLOTS_PER_DAY).fill(false);
  let k = 0;
  while (k < SLOTS_PER_DAY) {
    if (!dead[k]) {
      k++;
      continue;
    }
    let j = k;
    while (j < SLOTS_PER_DAY && dead[j]) j++;
    const from = k + (k > 0 ? FOLD_PAD : 0); // pad the side touching a live region
    const to = j - 1 - (j < SLOTS_PER_DAY ? FOLD_PAD : 0);
    if (to - from + 1 >= FOLD_MIN) {
      for (let i = from; i <= to; i++) fold[i] = true;
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

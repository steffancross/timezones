// Tiny shared helper for building the fixed 7×48 viewer grids the compute layer
// works in. Keeps the DAYS×SLOTS_PER_DAY shape in one place (no literal 7/48).

import { DAYS, SLOTS_PER_DAY } from '../config';

/** Build a DAYS×SLOTS_PER_DAY array, filling each cell via `fn(d, k)`. */
export function makeGrid<T>(fn: (d: number, k: number) => T): T[][] {
  return Array.from({ length: DAYS }, (_, d) =>
    Array.from({ length: SLOTS_PER_DAY }, (_, k) => fn(d, k)),
  );
}

import { describe, expect, it } from 'vitest';
import { rowSegments } from '@/lib/rooms/compute/segments';
import type { Grade } from '@/lib/rooms/compute/types';

// Build a 7×48 grade grid where the given rows are 'all' (live) and the rest 'none' (dead).
function gridWithLiveRows(live: Set<number>): Grade[][] {
  return Array.from({ length: 7 }, () =>
    Array.from({ length: 48 }, (_, k): Grade => (live.has(k) ? 'all' : 'none')),
  );
}
const liveRange = (from: number, to: number) => {
  const s = new Set<number>();
  for (let k = from; k <= to; k++) s.add(k);
  return s;
};

describe('rowSegments', () => {
  it('folds a long overnight dead band at the top', () => {
    // rows 0..7 dead (8 ≥ FOLD_MIN), 8..47 live
    expect(rowSegments(gridWithLiveRows(liveRange(8, 47)))).toEqual([
      { fold: true, from: 0, to: 7 },
      { fold: false, from: 8, to: 47 },
    ]);
  });

  it('keeps a short interior dead hole visible', () => {
    // 0..19 live, 20..21 dead (2 < FOLD_MIN), 22..47 live → one visible span
    const live = new Set<number>([...liveRange(0, 19), ...liveRange(22, 47)]);
    expect(rowSegments(gridWithLiveRows(live))).toEqual([{ fold: false, from: 0, to: 47 }]);
  });

  it('folds a bottom-edge dead band (regression vs old top-only bug)', () => {
    // 0..39 live, 40..47 dead (8 ≥ FOLD_MIN)
    expect(rowSegments(gridWithLiveRows(liveRange(0, 39)))).toEqual([
      { fold: false, from: 0, to: 39 },
      { fold: true, from: 40, to: 47 },
    ]);
  });

  it('folds a long interior dead run between two live spans', () => {
    const live = new Set<number>([...liveRange(0, 9), ...liveRange(20, 47)]);
    expect(rowSegments(gridWithLiveRows(live))).toEqual([
      { fold: false, from: 0, to: 9 },
      { fold: true, from: 10, to: 19 },
      { fold: false, from: 20, to: 47 },
    ]);
  });

  it('folds the whole day when nothing is live', () => {
    expect(rowSegments(gridWithLiveRows(new Set()))).toEqual([{ fold: true, from: 0, to: 47 }]);
  });
});

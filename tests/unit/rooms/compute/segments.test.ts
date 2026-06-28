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
  it('folds a long overnight dead band at the top, leaving 1h padding before live', () => {
    // rows 0..7 dead, 8..47 live. Top edge isn't padded; the live-adjacent side
    // keeps FOLD_PAD(2) visible → fold 0..5, pad 6..7.
    expect(rowSegments(gridWithLiveRows(liveRange(8, 47)))).toEqual([
      { fold: true, from: 0, to: 5 },
      { fold: false, from: 6, to: 47 },
    ]);
  });

  it('keeps a short interior dead hole visible', () => {
    // 0..19 live, 20..21 dead (2 < FOLD_MIN), 22..47 live → one visible span
    const live = new Set<number>([...liveRange(0, 19), ...liveRange(22, 47)]);
    expect(rowSegments(gridWithLiveRows(live))).toEqual([{ fold: false, from: 0, to: 47 }]);
  });

  it('folds a bottom-edge dead band with 1h padding after live (regression vs old top-only bug)', () => {
    // 0..39 live, 40..47 dead. Live-adjacent side padded (40..41 visible),
    // bottom edge not → fold 42..47.
    expect(rowSegments(gridWithLiveRows(liveRange(0, 39)))).toEqual([
      { fold: false, from: 0, to: 41 },
      { fold: true, from: 42, to: 47 },
    ]);
  });

  it('folds a long interior dead run, padded on both live-adjacent sides', () => {
    // dead 10..19 (10 slots); pad 2 each side → fold 12..17, pad 10..11 & 18..19.
    const live = new Set<number>([...liveRange(0, 9), ...liveRange(20, 47)]);
    expect(rowSegments(gridWithLiveRows(live))).toEqual([
      { fold: false, from: 0, to: 11 },
      { fold: true, from: 12, to: 17 },
      { fold: false, from: 18, to: 47 },
    ]);
  });

  it('folds the whole day when nothing is live', () => {
    expect(rowSegments(gridWithLiveRows(new Set()))).toEqual([{ fold: true, from: 0, to: 47 }]);
  });
});

import { describe, expect, it } from 'vitest';
import { groupContiguous } from '@/components/converter/HourStrip';

describe('groupContiguous', () => {
  it('returns [] for empty input', () => {
    expect(groupContiguous([])).toEqual([]);
  });

  it('returns a single run for one element', () => {
    expect(groupContiguous([5])).toEqual([[5, 5]]);
  });

  it('groups a fully contiguous range into one run', () => {
    expect(groupContiguous([0, 1, 2, 3])).toEqual([[0, 3]]);
  });

  it('splits at gaps', () => {
    expect(groupContiguous([0, 1, 2, 5, 6, 10])).toEqual([
      [0, 2],
      [5, 6],
      [10, 10],
    ]);
  });

  it('sorts unsorted input before grouping', () => {
    expect(groupContiguous([6, 5, 0, 2, 1])).toEqual([
      [0, 2],
      [5, 6],
    ]);
  });

  it('handles a single-column gap', () => {
    expect(groupContiguous([0, 2, 4])).toEqual([
      [0, 0],
      [2, 2],
      [4, 4],
    ]);
  });
});

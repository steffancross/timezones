import { describe, expect, it } from 'vitest';
import { MINUTES_PER_DAY, RANGE_STEP_MIN, rangeColumns } from '@/lib/converter/range';

describe('rangeColumns', () => {
  it('returns null when either endpoint is null', () => {
    expect(rangeColumns(null, null)).toBeNull();
    expect(rangeColumns(180, null)).toBeNull();
    expect(rangeColumns(null, 360)).toBeNull();
  });

  it.each([
    // [startMin, endMin, startCol, endCol, description]
    [840, 900, 14, 14, 'single full-hour tile (14:00–15:00)'],
    [180, 360, 3, 5, 'three full hours (3:00–6:00)'],
    [180, 315, 3, 5, '3:00–5:15 — sliver lights column 5'],
    [180, 300, 3, 4, '3:00–5:00 — boundary, column 5 not lit'],
    [540, 555, 9, 9, '15-min minimum (9:00–9:15)'],
    [1380, 1440, 23, 23, 'ends at next-day midnight — capped at column 23'],
    [0, 1440, 0, 23, 'whole day'],
  ])('maps {%i, %i} → cols [%i..%i] (%s)', (startMin, endMin, startCol, endCol) => {
    expect(rangeColumns(startMin, endMin)).toEqual({ startCol, endCol });
  });

  it('exposes the expected constants', () => {
    expect(RANGE_STEP_MIN).toBe(15);
    expect(MINUTES_PER_DAY).toBe(1440);
  });
});

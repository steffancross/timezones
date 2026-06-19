// Closest-partial-today (spec 6, Overview). When there's no full overlap left in
// the viewer's current day, Overview names the BEST-COVERED remaining slot and who's
// out ("closest is 5 PM, but Sam & Priya are out"). The engine's windows are
// everyone-in only, so this is the one extra scan that surfaces a partial.
//
// Like the window cores, it takes a now-INDEPENDENT prepared bundle so Overview
// reuses the same memoized projection and only re-scans on the minute tick.

import { SLOTS_PER_DAY } from '../config';
import { cellInstant } from './cells';
import type { ComputeInput, PartialToday } from './types';
import { HALF_HOUR_MS, type Prepared, prepare, todayIndex } from './windows';

/**
 * Best-covered remaining slot today over the compute set. Tie-break (lexicographic):
 * fewest `n` (out) → more `y` (firm yes) over `s` (if-needed) → earliest slot.
 * Returns null when the prepared week isn't the current week, the compute set is
 * empty, or no remaining non-gap slot has anyone available (→ the plain copy).
 * Does NOT exclude a full-overlap slot — the caller invokes this only when there's
 * no full window left today.
 */
export function closestPartialTodayFrom(
  p: Prepared,
  now: number,
  viewerTz: string,
): PartialToday | null {
  const d = todayIndex(p, now, viewerTz);
  if (d === -1) return null;

  const parts = p.projection.participants;
  if (parts.length === 0) return null;

  let bestSlot = -1;
  let bestN = Number.POSITIVE_INFINITY;
  let bestY = -1;
  let bestOut: string[] = [];

  for (let k = 0; k < SLOTS_PER_DAY; k++) {
    const cell = cellInstant(p.weekStart, d, k);
    if (cell.nonexistent) continue; // spring-forward gap — never a meeting time
    if (cell.millis + HALF_HOUR_MS <= now) continue; // fully past

    let nCount = 0;
    let yCount = 0;
    const outIds: string[] = [];
    for (const part of parts) {
      const state = part.grid[d]?.[k] ?? 'n';
      if (state === 'n') {
        nCount++;
        outIds.push(part.participantId);
      } else if (state === 'y') {
        yCount++;
      }
    }
    if (nCount === parts.length) continue; // nobody available — not a "closest"

    // Strict improvement only, scanning ascending, so earliest slot wins ties.
    if (nCount < bestN || (nCount === bestN && yCount > bestY)) {
      bestSlot = k;
      bestN = nCount;
      bestY = yCount;
      bestOut = outIds;
    }
  }

  return bestSlot === -1 ? null : { slot: bestSlot, outParticipants: bestOut };
}

/** Best-covered remaining slot today, or null (see `closestPartialTodayFrom`). */
export function closestPartialToday(input: ComputeInput): PartialToday | null {
  return closestPartialTodayFrom(prepare(input), input.now, input.viewerTz);
}

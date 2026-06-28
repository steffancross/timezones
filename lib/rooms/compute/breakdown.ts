// Per-cell breakdown for hover (desktop) / tap (mobile) (spec 3). The per-person
// states over the compute set at one viewer cell, plus the free/soft/out split
// that drives the "4 free · 1 if needed" readout.

import { project } from './projection';
import type { CellBreakdown, ComputeInput } from './types';

export function cellBreakdown(input: ComputeInput, day: number, slot: number): CellBreakdown {
  const { participants } = project(input);

  const perPerson = participants.map((p) => ({
    participantId: p.participantId,
    state: p.grid[day]?.[slot] ?? 'n',
  }));

  let freeCount = 0;
  let softCount = 0;
  let outCount = 0;
  for (const { state } of perPerson) {
    if (state === 'y') freeCount++;
    else if (state === 's') softCount++;
    else outCount++;
  }

  return { perPerson, freeCount, softCount, outCount };
}

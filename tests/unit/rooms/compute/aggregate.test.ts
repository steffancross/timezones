import { aggregate, cellGrade } from '@/lib/rooms/compute/aggregate';
import { project } from '@/lib/rooms/compute/projection';
import type { ComputeInput } from '@/lib/rooms/compute/types';
import type { PublicParticipant, RoomState } from '@/lib/rooms/db';
import { describe, expect, it } from 'vitest';

describe('cellGrade', () => {
  it('grades per the resolved rule', () => {
    expect(cellGrade(['y', 'y'])).toBe('all');
    expect(cellGrade(['y', 'n'])).toBe('none'); // a responder out
    expect(cellGrade(['y', 's'])).toBe('some'); // someone if-needed
    expect(cellGrade(['s', 's'])).toBe('some');
    expect(cellGrade([])).toBe('none'); // empty compute set
  });
});

const SUN = '2026-01-04';
function week(set: Record<number, 'n' | 'y' | 's'>): string {
  const slots = Array<'n' | 'y' | 's'>(336).fill('n');
  for (const [i, s] of Object.entries(set)) slots[Number(i)] = s;
  return slots.join('');
}
function p(id: string, generalWeek: string, timezone = 'UTC'): PublicParticipant {
  return {
    id,
    displayName: id,
    timezone,
    generalWeek,
    overrides: {},
    hasResponded: true,
    hasPassword: false,
  };
}
const room = (participants: PublicParticipant[]): RoomState => ({
  room: { id: 'r', name: null, schemaVersion: 1 },
  participants,
});

describe('aggregate', () => {
  it('combines responders per cell (Mon 09:00 = slot 18)', () => {
    const input: ComputeInput = {
      room: room([p('a', week({ 18: 'y' })), p('b', week({ 18: 's' }))]),
      viewerTz: 'UTC',
      weekAnchor: SUN,
      now: 0,
    };
    expect(aggregate(project(input)).grade[1]?.[18]).toBe('some');
  });

  it('forces a non-existent (spring-forward) cell to none even when everyone is available', () => {
    const allYes = p('a', 'y'.repeat(336), 'America/New_York');
    const input: ComputeInput = {
      room: room([allYes]),
      viewerTz: 'America/New_York',
      weekAnchor: '2026-03-08', // US spring-forward Sunday
      now: 0,
    };
    const { grade, nonexistent } = aggregate(project(input));
    expect(nonexistent[0]?.[4]).toBe(true); // 02:00 doesn't exist
    expect(grade[0]?.[4]).toBe('none'); // forced, despite the 'y'
    expect(grade[0]?.[6]).toBe('all'); // 03:00 exists and is available
  });
});

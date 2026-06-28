import { describe, expect, it } from 'vitest';
import type { SlotState } from '@/lib/rooms/blob';
import { computeSet, project } from '@/lib/rooms/compute/projection';
import type { ComputeInput } from '@/lib/rooms/compute/types';
import type { PublicParticipant, RoomState } from '@/lib/rooms/db';

const SUN = '2026-01-04'; // a winter Sunday — no DST for any zone used here

function mkWeek(set: Record<number, SlotState>): string {
  const slots = Array<SlotState>(336).fill('n');
  for (const [i, s] of Object.entries(set)) slots[Number(i)] = s;
  return slots.join('');
}
function mkDay(set: Record<number, SlotState>): string {
  const slots = Array<SlotState>(48).fill('n');
  for (const [i, s] of Object.entries(set)) slots[Number(i)] = s;
  return slots.join('');
}
function p(over: Partial<PublicParticipant> & { id: string; timezone: string }): PublicParticipant {
  return {
    displayName: over.id,
    generalWeek: null,
    overrides: {},
    hasResponded: true,
    hasPassword: false,
    ...over,
  };
}
function room(participants: PublicParticipant[]): RoomState {
  return { room: { id: 'r', name: null, schemaVersion: 1 }, participants };
}
const input = (participants: PublicParticipant[], viewerTz: string): ComputeInput => ({
  room: room(participants),
  viewerTz,
  weekAnchor: SUN,
  now: 0,
});

describe('project — same-zone identity', () => {
  it('re-indexes the Monday-stored blob into the Sunday-first viewer grid', () => {
    // storage Sunday=6, Monday=0. slot 18 = 09:00.
    const me = p({
      id: 'me',
      timezone: 'America/New_York',
      generalWeek: mkWeek({ [6 * 48 + 18]: 'y', [0 * 48 + 18]: 's' }),
    });
    const { participants } = project(input([me], 'America/New_York'));
    const grid = participants[0]?.grid;
    expect(grid?.[0]?.[18]).toBe('y'); // viewer Sunday
    expect(grid?.[1]?.[18]).toBe('s'); // viewer Monday
    expect(grid?.[2]?.[18]).toBe('n'); // viewer Tuesday (unset)
  });
});

describe('project — cross-zone day-shift', () => {
  it('lands a Tokyo participant on the correct LA cells, incl. crossing LA midnight', () => {
    // Tokyo Wed(2) 19:00 (slot 38) and Wed 00:00 (slot 0).
    const yuki = p({
      id: 'yuki',
      timezone: 'Asia/Tokyo',
      generalWeek: mkWeek({ [2 * 48 + 38]: 'y', [2 * 48 + 0]: 'y' }),
    });
    const grid = project(input([yuki], 'America/Los_Angeles')).participants[0]?.grid;
    // Tokyo Wed 19:00 JST = Wed 02:00 PST → viewer Wed (d=3), 02:00 = k4.
    expect(grid?.[3]?.[4]).toBe('y');
    // Tokyo Wed 00:00 JST = Tue 07:00 PST → viewer Tuesday (d=2), 07:00 = k14 (different day column).
    expect(grid?.[2]?.[14]).toBe('y');
  });
});

describe('project — override beats template (by participant local date)', () => {
  const base = (overrides: Record<string, string>) =>
    p({
      id: 'yuki',
      timezone: 'Asia/Tokyo',
      generalWeek: mkWeek({ [2 * 48 + 38]: 'y', [1 * 48 + 38]: 'y' }), // Wed & Tue 19:00 'y'
      overrides,
    });

  it('an override on the participant local date wins, leaving other dates on the template', () => {
    const withOverride = base({ '2026-01-07': mkDay({ 38: 'n' }) }); // Tokyo Wed 19:00 → out
    const grid = project(input([withOverride], 'America/Los_Angeles')).participants[0]?.grid;
    expect(grid?.[3]?.[4]).toBe('n'); // Wed 02:00 PST ← Tokyo Wed 19:00, now overridden
    expect(grid?.[2]?.[4]).toBe('y'); // Tue 02:00 PST ← Tokyo Tue 19:00, still template
  });
});

describe('project — responder with null template but overrides', () => {
  it('treats missing template as out and still applies overrides (no crash)', () => {
    const only = p({
      id: 'o',
      timezone: 'UTC',
      generalWeek: null,
      overrides: { '2026-01-05': mkDay({ 18: 'y' }) },
    });
    const grid = project(input([only], 'UTC')).participants[0]?.grid;
    expect(grid?.[1]?.[18]).toBe('y'); // Mon 09:00 from override
    expect(grid?.[1]?.[17]).toBe('n'); // unset → out
  });
});

describe('computeSet', () => {
  it('excludes unresponded and honours the selected filter', () => {
    const a = p({ id: 'a', timezone: 'UTC', generalWeek: mkWeek({}) });
    const b = p({ id: 'b', timezone: 'UTC', generalWeek: mkWeek({}) });
    const ghost = p({ id: 'ghost', timezone: 'UTC', hasResponded: false });
    expect(computeSet(input([a, b, ghost], 'UTC')).map((x) => x.id)).toEqual(['a', 'b']);
    const sel: ComputeInput = { ...input([a, b, ghost], 'UTC'), selected: ['b'] };
    expect(computeSet(sel).map((x) => x.id)).toEqual(['b']);
  });
});

import { describe, expect, it } from 'vitest';
import type { SlotState } from '@/lib/rooms/blob';
import { closestPartialToday, closestPartialTodayFrom } from '@/lib/rooms/compute/partial';
import { prepare } from '@/lib/rooms/compute/windows';
import type { ComputeInput } from '@/lib/rooms/compute/types';
import type { PublicParticipant, RoomState } from '@/lib/rooms/db';
import { DateTime } from '@/lib/time/luxon';

const SUN = '2026-01-04'; // a winter Sunday — no DST for any zone used here
const at = (iso: string) => DateTime.fromISO(iso, { zone: 'UTC' }).toMillis();
const SUN_START = at('2026-01-04T00:00:00'); // viewer (UTC) Sunday midnight → all slots remaining

// Storage is Monday-indexed: Sunday = blobDow 6. For a UTC viewer, viewer Sunday
// slot k maps to UTC slot k → participant-UTC Sunday slot k = blob index 6*48 + k.
const sun = (slots: Record<number, SlotState>): string => {
  const arr = Array<SlotState>(336).fill('n');
  for (const [k, s] of Object.entries(slots)) arr[6 * 48 + Number(k)] = s;
  return arr.join('');
};
const p = (id: string, timezone: string, generalWeek: string): PublicParticipant => ({
  id,
  displayName: id,
  timezone,
  generalWeek,
  overrides: {},
  hasResponded: true,
  hasPassword: false,
});
const room = (participants: PublicParticipant[]): RoomState => ({
  room: { id: 'r', name: null, schemaVersion: 1 },
  participants,
});
const input = (
  participants: PublicParticipant[],
  over: Partial<ComputeInput> = {},
): ComputeInput => ({
  room: room(participants),
  viewerTz: 'UTC',
  weekAnchor: SUN,
  now: SUN_START,
  ...over,
});

describe('closestPartialToday — picks the best-covered remaining slot', () => {
  it('chooses the slot with the fewest people out', () => {
    // slot 20: a,b,c free, d out (1 out). slot 30: only a free (3 out).
    const parts = [
      p('a', 'UTC', sun({ 20: 'y', 30: 'y' })),
      p('b', 'UTC', sun({ 20: 'y' })),
      p('c', 'UTC', sun({ 20: 'y' })),
      p('d', 'UTC', sun({})),
    ];
    expect(closestPartialToday(input(parts))).toEqual({ slot: 20, outParticipants: ['d'] });
  });

  it('breaks ties on fewest-out by preferring firm yeses over if-needed', () => {
    // both slots have exactly one out; slot 20 has 3 firm yeses, slot 22 leans on if-needed.
    const parts = [
      p('a', 'UTC', sun({ 20: 'y', 22: 'y' })),
      p('b', 'UTC', sun({ 20: 'y', 22: 's' })),
      p('c', 'UTC', sun({ 20: 'y', 22: 's' })),
      p('d', 'UTC', sun({})),
    ];
    expect(closestPartialToday(input(parts))?.slot).toBe(20);
  });

  it('breaks remaining ties on the earliest slot', () => {
    // slots 20 and 22 are identical (2 free, 2 out) → earliest wins.
    const parts = [
      p('a', 'UTC', sun({ 20: 'y', 22: 'y' })),
      p('b', 'UTC', sun({ 20: 'y', 22: 'y' })),
      p('c', 'UTC', sun({})),
      p('d', 'UTC', sun({})),
    ];
    expect(closestPartialToday(input(parts))?.slot).toBe(20);
  });

  it('projects a fractional-offset (+5:30) responder via sample-at-start', () => {
    // Kolkata Sunday slot 31 (15:30 IST) = 10:00 UTC = viewer slot 20.
    const parts = [p('kol', 'Asia/Kolkata', sun({ 31: 'y' })), p('out', 'UTC', sun({}))];
    expect(closestPartialToday(input(parts))).toEqual({ slot: 20, outParticipants: ['out'] });
  });
});

describe('closestPartialToday — returns null', () => {
  it('when the viewed week is not the current week', () => {
    const parts = [p('a', 'UTC', sun({ 20: 'y' })), p('b', 'UTC', sun({}))];
    expect(closestPartialToday(input(parts, { now: at('2026-01-11T00:00:00') }))).toBeNull();
  });

  it('when no remaining slot has anyone available (coverage 0)', () => {
    const parts = [p('a', 'UTC', sun({})), p('b', 'UTC', sun({}))];
    expect(closestPartialToday(input(parts))).toBeNull();
  });

  it('when the only covered slot is already past', () => {
    // a is free only at slot 20 (10:00–10:30 UTC); now is 11:00 → that slot is past.
    const parts = [p('a', 'UTC', sun({ 20: 'y' })), p('b', 'UTC', sun({}))];
    expect(closestPartialToday(input(parts, { now: at('2026-01-04T11:00:00') }))).toBeNull();
  });

  it('when the compute set is empty', () => {
    const parts = [p('a', 'UTC', sun({ 20: 'y' })), p('b', 'UTC', sun({}))];
    expect(closestPartialToday(input(parts, { selected: [] }))).toBeNull();
  });
});

describe('closestPartialTodayFrom — reuses a prepared bundle', () => {
  it('matches the wrapper and re-evaluates for a different now', () => {
    const parts = [
      p('a', 'UTC', sun({ 20: 'y' })),
      p('b', 'UTC', sun({ 20: 'y' })),
      p('c', 'UTC', sun({})),
    ];
    const inp = input(parts);
    const prepared = prepare(inp);
    expect(closestPartialTodayFrom(prepared, inp.now, inp.viewerTz)).toEqual(
      closestPartialToday(inp),
    );
    // Same bundle, later now (after slot 20) → the covered slot is past → null.
    expect(closestPartialTodayFrom(prepared, at('2026-01-04T11:00:00'), inp.viewerTz)).toBeNull();
  });
});

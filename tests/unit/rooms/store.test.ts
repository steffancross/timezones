import { describe, expect, it } from 'vitest';
import type { PublicParticipant, RoomState } from '@/lib/rooms/db';
import { createRoomStore } from '@/lib/rooms/store';

const WEEK_Y = 'y'.repeat(336);
const WEEK_N = 'n'.repeat(336);

const p = (id: string, generalWeek: string | null, hasResponded = true): PublicParticipant => ({
  id,
  displayName: id,
  timezone: 'UTC',
  generalWeek,
  overrides: {},
  hasResponded,
  hasPassword: false,
});

const room = (participants: PublicParticipant[]): RoomState => ({
  room: { id: 'r', name: 'R', schemaVersion: 1 },
  participants,
});

function makeStore(participants: PublicParticipant[], youId: string | null) {
  return createRoomStore({
    state: room(participants),
    youId,
    viewerTz: 'UTC',
    weekAnchor: '2026-06-14',
    now: 0,
  });
}

const find = (store: ReturnType<typeof makeStore>, id: string) =>
  store.getState().state.participants.find((x) => x.id === id);

describe('reconcileServerState — fetch-on-focus merge (spec 7c)', () => {
  it('takes the server blob for you when not dirty', () => {
    const store = makeStore([p('you', WEEK_N), p('b', WEEK_N)], 'you');
    store.getState().reconcileServerState({
      ...room([p('you', WEEK_Y), p('b', WEEK_N)]),
      you: { participantId: 'you' },
    });
    expect(find(store, 'you')?.generalWeek).toBe(WEEK_Y);
  });

  it('preserves your unsaved paint when dirty, but still merges others', () => {
    const store = makeStore([p('you', WEEK_Y), p('b', WEEK_N)], 'you');
    store.getState().setDirty(true);
    store.getState().reconcileServerState({
      ...room([p('you', WEEK_N), p('b', WEEK_Y)]),
      you: { participantId: 'you' },
    });
    expect(find(store, 'you')?.generalWeek).toBe(WEEK_Y); // mine preserved
    expect(find(store, 'b')?.generalWeek).toBe(WEEK_Y); // server merged
  });

  it('keeps prior toggles, default-selects newcomers, drops departed', () => {
    const store = makeStore([p('a', WEEK_N), p('b', WEEK_N)], null);
    store.getState().toggleSelected('b'); // deselect b
    expect(store.getState().selected.has('b')).toBe(false);

    store.getState().reconcileServerState({ ...room([p('b', WEEK_N), p('c', WEEK_N)]), you: null });

    const sel = store.getState().selected;
    expect(sel.has('a')).toBe(false); // departed → dropped
    expect(sel.has('b')).toBe(false); // still present → prior (deselected) toggle kept
    expect(sel.has('c')).toBe(true); // newly joined → default-selected
  });

  it('updates youId from the incoming resolve (e.g. claimed elsewhere → lurker)', () => {
    const store = makeStore([p('you', WEEK_N)], 'you');
    store.getState().reconcileServerState({ ...room([p('you', WEEK_N)]), you: null });
    expect(store.getState().youId).toBeNull();
  });
});

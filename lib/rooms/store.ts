// Per-mount room store (spec 5 refactor). Mirrors the converter's vanilla-store
// pattern (lib/store/converter.ts): created fresh per RoomDataProvider mount and
// injected via React context, with selector subscriptions so a mutation (e.g. an
// optimistic availability save) doesn't re-render the whole room.
//
// It's read-mostly: the heavy projection/aggregate are derived and cached on the
// input-changing actions (never on `now`, which the engine ignores). Paint draft
// + save status live in the Availability components, not here — the only writes
// the store needs are "I became a participant" and "my saved availability merged
// in", both of which must recompute the shared grid for the other tabs.

import { createStore } from 'zustand/vanilla';
import type { Overrides } from './blob';
import { aggregate, type AggregateGrid, project, type Projection } from './compute';
import type { PublicParticipant, RoomState } from './db';

export interface RoomStoreState {
  state: RoomState;
  youId: string | null;
  viewerTz: string;
  weekAnchor: string;
  selected: Set<string>;
  now: number;
  /** Your availability has unsaved/in-flight edits — a focus refetch must not clobber it. */
  dirty: boolean;
  /** Per-viewer display preference — persisted to localStorage under 'ar_color_mode'. */
  colorMode: 'consensus' | 'heatmap';
  // Derived — recomputed by the input-changing actions below.
  projection: Projection;
  grid: AggregateGrid;
}

export interface RoomActions {
  setWeekAnchor: (weekAnchor: string) => void;
  toggleSelected: (participantId: string) => void;
  setNow: (now: number) => void;
  /** A lurker became a participant (spec 5 contribute/recovery). */
  becomeParticipant: (participant: PublicParticipant, youId: string) => void;
  /** Merge your just-saved availability into your row so every tab updates. */
  applyMyAvailability: (update: { generalWeek?: string; overrides?: Overrides }) => void;
  /** Your saved identity (name/timezone/password) — replaces your row; your zone
   * is the viewer zone, so changing it reprojects every tab. */
  applyMyIdentity: (participant: PublicParticipant) => void;
  /** Live room rename (any participant). */
  setRoomName: (name: string) => void;
  /** Mark your availability dirty (set by the debounced save while a write is pending). */
  setDirty: (dirty: boolean) => void;
  /** Switch the per-viewer grid color mode and persist to localStorage. */
  setColorMode: (colorMode: 'consensus' | 'heatmap') => void;
  /** Merge a focus-refetched server state without clobbering your unsaved paint. */
  reconcileServerState: (incoming: RoomState & { you?: { participantId: string } | null }) => void;
}

export type RoomStore = RoomStoreState & RoomActions;

export type RoomStoreSeed = {
  state: RoomState;
  youId: string | null;
  viewerTz: string;
  weekAnchor: string;
  selected?: Set<string>;
  now?: number;
  colorMode?: 'consensus' | 'heatmap';
};

/** Recompute the cached projection/aggregate from the current inputs. */
function derive(s: Pick<RoomStoreState, 'state' | 'viewerTz' | 'weekAnchor' | 'selected'>): {
  projection: Projection;
  grid: AggregateGrid;
} {
  const proj = project({
    room: s.state,
    viewerTz: s.viewerTz,
    weekAnchor: s.weekAnchor,
    now: 0, // engine ignores `now`; only windows/status read it (spec 6)
    selected: [...s.selected],
  });
  return { projection: proj, grid: aggregate(proj) };
}

export function createRoomStore(seed: RoomStoreSeed) {
  const selected = seed.selected ?? new Set(seed.state.participants.map((p) => p.id));
  const base = {
    state: seed.state,
    youId: seed.youId,
    viewerTz: seed.viewerTz,
    weekAnchor: seed.weekAnchor,
    selected,
    now: seed.now ?? 0,
    dirty: false,
    colorMode: seed.colorMode ?? ('consensus' as const),
  };

  return createStore<RoomStore>()((set) => ({
    ...base,
    ...derive(base),

    setWeekAnchor: (weekAnchor) => set((s) => ({ weekAnchor, ...derive({ ...s, weekAnchor }) })),

    toggleSelected: (participantId) =>
      set((s) => {
        const next = new Set(s.selected);
        if (next.has(participantId)) next.delete(participantId);
        else next.add(participantId);
        return { selected: next, ...derive({ ...s, selected: next }) };
      }),

    setNow: (now) => set({ now }), // no recompute — projection doesn't use `now`

    becomeParticipant: (participant, youId) =>
      set((s) => {
        const exists = s.state.participants.some((p) => p.id === participant.id);
        const participants = exists ? s.state.participants : [...s.state.participants, participant];
        const state = { ...s.state, participants };
        const selectedNext = new Set(s.selected).add(youId);
        return {
          state,
          youId,
          selected: selectedNext,
          ...derive({ ...s, state, selected: selectedNext }),
        };
      }),

    applyMyAvailability: ({ generalWeek, overrides }) =>
      set((s) => {
        if (!s.youId) return s;
        const participants = s.state.participants.map((p) =>
          p.id === s.youId
            ? {
                ...p,
                generalWeek: generalWeek ?? p.generalWeek,
                overrides: overrides ?? p.overrides,
                hasResponded: true, // the save that lands here flips first-response
              }
            : p,
        );
        const state = { ...s.state, participants };
        return { state, ...derive({ ...s, state }) };
      }),

    applyMyIdentity: (participant) =>
      set((s) => {
        if (!s.youId) return s;
        const participants = s.state.participants.map((p) => (p.id === s.youId ? participant : p));
        const state = { ...s.state, participants };
        const viewerTz = participant.timezone; // you → your zone is the viewer frame
        return { state, viewerTz, ...derive({ ...s, state, viewerTz }) };
      }),

    setRoomName: (name) => set((s) => ({ state: { ...s.state, room: { ...s.state.room, name } } })),

    setDirty: (dirty) => set({ dirty }),

    setColorMode: (colorMode) => {
      try {
        localStorage.setItem('ar_color_mode', colorMode);
      } catch {}
      set({ colorMode });
    },

    reconcileServerState: (incoming) =>
      set((s) => {
        const { you, ...incomingState } = incoming;
        const youId = you !== undefined ? (you?.participantId ?? null) : s.youId;

        // Preserve your own availability while you have unsaved/in-flight paint —
        // take everything else (incl. other people's updates) from the server.
        const participants = incomingState.participants.map((p) => {
          if (s.dirty && s.youId && p.id === s.youId) {
            const mine = s.state.participants.find((x) => x.id === s.youId);
            if (mine) {
              return {
                ...p,
                generalWeek: mine.generalWeek,
                overrides: mine.overrides,
                hasResponded: mine.hasResponded,
              };
            }
          }
          return p;
        });
        const state = { ...incomingState, participants };

        // selected is a personal, non-destructive view: keep prior toggles for
        // still-present people, default-select anyone newly joined, drop departed.
        const knownIds = new Set(s.state.participants.map((p) => p.id));
        const selectedNext = new Set<string>();
        for (const p of participants) {
          if (knownIds.has(p.id)) {
            if (s.selected.has(p.id)) selectedNext.add(p.id);
          } else {
            selectedNext.add(p.id);
          }
        }

        return {
          state,
          youId,
          selected: selectedNext,
          ...derive({
            state,
            viewerTz: s.viewerTz,
            weekAnchor: s.weekAnchor,
            selected: selectedNext,
          }),
        };
      }),
  }));
}

export type RoomStoreApi = ReturnType<typeof createRoomStore>;

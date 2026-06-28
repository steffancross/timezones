'use client';

// Shared room-data context (spec 4), reused by Overview (spec 6). Mirrors the
// converter's store-context shape, but the data is read-mostly so it's plain
// React context + useState rather than Zustand. Holds the loaded RoomState, the
// viewer's identity/zone, the viewed week, the selected (aggregate) set, and a
// ticking `now` — plus the memoized projection/aggregate so consumers share one
// computation and hovering never re-projects.

import { createContext, useContext } from 'react';
import type { AggregateGrid, Projection } from '@/lib/rooms/compute';
import type { RoomState } from '@/lib/rooms/db';

export type RoomDataValue = {
  state: RoomState;
  youId: string | null;
  viewerTz: string;
  weekAnchor: string; // Sunday of the viewed week, 'YYYY-MM-DD'
  selected: Set<string>; // participant ids in the aggregate
  now: number; // epoch ms, ticks each minute

  /** Memoized engine output for (state, viewerTz, weekAnchor, selected). */
  projection: Projection;
  grid: AggregateGrid;

  setWeekAnchor: (weekAnchor: string) => void;
  toggleSelected: (participantId: string) => void;
};

const RoomDataContext = createContext<RoomDataValue | null>(null);

export const RoomDataContextProvider = RoomDataContext.Provider;

export function useRoomData(): RoomDataValue {
  const ctx = useContext(RoomDataContext);
  if (!ctx) throw new Error('useRoomData must be used within a RoomDataProvider');
  return ctx;
}

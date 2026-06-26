'use client';

// Creates a per-mount room store seeded from the page's SSR props and exposes it
// via context. Mirrors ConverterStateProvider. `now` ticks each minute into the
// store (for the day-view cursor / live status); it doesn't trigger re-projection.

import { useEffect, useRef } from 'react';
import { currentWeekAnchor } from '@/lib/rooms/compute';
import type { RoomState } from '@/lib/rooms/db';
import { createRoomStore } from '@/lib/rooms/store';
import { useNow } from '@/lib/hooks/useNow';
import { RoomFreshness } from './RoomFreshness';
import { RoomStoreProvider } from './room-store-context';

interface Props {
  state: RoomState;
  youId: string | null;
  viewerTz: string;
  /** Override the initial viewed week (Sunday). Defaults to the current week. */
  initialWeekAnchor?: string;
  /** Pin `now` (ms) and suppress the live minute tick — for deterministic tests/SSR. */
  now?: number;
  children: React.ReactNode;
}

export function RoomDataProvider({
  state,
  youId,
  viewerTz,
  initialWeekAnchor,
  now: pinnedNow,
  children,
}: Props) {
  const seedNow = pinnedNow ?? Date.now();
  const storeRef = useRef<ReturnType<typeof createRoomStore> | null>(null);
  if (!storeRef.current) {
    let colorMode: 'consensus' | 'heatmap' = 'consensus';
    try {
      if (localStorage.getItem('ar_color_mode') === 'heatmap') colorMode = 'heatmap';
    } catch {}
    storeRef.current = createRoomStore({
      state,
      youId,
      viewerTz,
      weekAnchor: initialWeekAnchor ?? currentWeekAnchor(viewerTz, seedNow),
      now: seedNow,
      colorMode,
    });
  }
  const store = storeRef.current;

  // When `now` is pinned, ignore the live tick so the store stays deterministic.
  const live = useNow('minute').toMillis();
  const now = pinnedNow ?? live;
  // biome-ignore lint/correctness/useExhaustiveDependencies: store identity is stable (per-mount ref)
  useEffect(() => {
    store.getState().setNow(now);
  }, [now]);

  return (
    <RoomStoreProvider value={store}>
      <RoomFreshness />
      {children}
    </RoomStoreProvider>
  );
}

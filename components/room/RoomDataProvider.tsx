'use client';

// Creates a per-mount room store seeded from the page's SSR props and exposes it
// via context. Mirrors ConverterStateProvider. `now` ticks each minute into the
// store (for the day-view cursor / live status); it doesn't trigger re-projection.

import { useEffect, useRef } from 'react';
import { currentWeekAnchor } from '@/lib/rooms/compute';
import type { RoomState } from '@/lib/rooms/db';
import { createRoomStore } from '@/lib/rooms/store';
import { useNow } from '@/lib/hooks/useNow';
import { RoomStoreProvider } from './room-store-context';

interface Props {
  state: RoomState;
  youId: string | null;
  viewerTz: string;
  /** Override the initial viewed week (Sunday). Defaults to the current week. */
  initialWeekAnchor?: string;
  children: React.ReactNode;
}

export function RoomDataProvider({ state, youId, viewerTz, initialWeekAnchor, children }: Props) {
  const storeRef = useRef<ReturnType<typeof createRoomStore> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createRoomStore({
      state,
      youId,
      viewerTz,
      weekAnchor: initialWeekAnchor ?? currentWeekAnchor(viewerTz, Date.now()),
      now: Date.now(),
    });
  }
  const store = storeRef.current;

  const now = useNow('minute').toMillis();
  // biome-ignore lint/correctness/useExhaustiveDependencies: store identity is stable (per-mount ref)
  useEffect(() => {
    store.getState().setNow(now);
  }, [now]);

  return <RoomStoreProvider value={store}>{children}</RoomStoreProvider>;
}

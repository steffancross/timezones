'use client';

// Holds the per-mount room store and exposes selector hooks — mirrors the
// converter's store-context. Per-mount (not a module singleton) keeps two rooms
// in one tab isolated and lets the SSR snapshot reflect the seeded state.

import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { RoomStore, RoomStoreApi } from '@/lib/rooms/store';

const RoomStoreContext = createContext<RoomStoreApi | null>(null);

export const RoomStoreProvider = RoomStoreContext.Provider;

/** Raw store API — for `.getState()` / `.subscribe()` in event handlers and the save hook. */
export function useRoomStoreApi(): RoomStoreApi {
  const store = useContext(RoomStoreContext);
  if (!store) throw new Error('useRoomStore must be used within a RoomDataProvider');
  return store;
}

/** Subscribe to a slice of room state. */
export function useRoomStore<T>(selector: (s: RoomStore) => T): T {
  return useStore(useRoomStoreApi(), selector);
}

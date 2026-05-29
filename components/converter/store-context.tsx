'use client';

import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { ConverterActions, ConverterState, ConverterStoreApi } from '@/lib/store/converter';

/**
 * Holds the per-mount converter store. Each `ConverterStateProvider` creates a
 * fresh store via `createConverterStore(initialState)` and injects it here.
 *
 * Per-mount (rather than module-singleton) is what fixes the SSR EmptyState
 * flash: zustand@5's React adapter wires `useSyncExternalStore`'s server
 * snapshot to `api.getInitialState()`, so the only way a child's `useStore`
 * sees populated zones during SSR is if the store was *created* with them
 * already in place — not retroactively `set()`-ed in a provider render body.
 */
const ConverterStoreContext = createContext<ConverterStoreApi | null>(null);

export const ConverterStoreProvider = ConverterStoreContext.Provider;

/** Raw store API (use for `.getState()`, `.subscribe()` — e.g. in event handlers). */
export function useConverterStoreApi(): ConverterStoreApi {
  const store = useContext(ConverterStoreContext);
  if (!store) {
    throw new Error('useConverterStoreApi must be used within a ConverterStateProvider');
  }
  return store;
}

/** Subscribe to a slice of converter state. Same selector API as before. */
export function useConverterStore<T>(selector: (state: ConverterState & ConverterActions) => T): T {
  const store = useConverterStoreApi();
  return useStore(store, selector);
}

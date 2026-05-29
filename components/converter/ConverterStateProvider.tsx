'use client';

import { Suspense, useEffect, useRef } from 'react';
import { type ConverterState, createConverterStore } from '@/lib/store/converter';
import { attachPersistence, loadPersistedPrefs } from '@/lib/store/persistence';
import { SearchParamsHydrator } from './SearchParamsHydrator';
import { ConverterStoreProvider } from './store-context';
import { UrlSync } from './UrlSync';

interface Props {
  /**
   * Per-page initial state — usually parsed from the URL (zones, anchor) on
   * pair/city pages, or `{}` on the free-form landing page. URL state takes
   * precedence over persisted prefs where both supply the same field.
   */
  initialState?: Partial<ConverterState>;
  children: React.ReactNode;
}

/**
 * Creates a per-mount converter store seeded with `initialState` and exposes
 * it via React context.
 *
 * Why per-mount, not a module singleton:
 *   zustand@5's React adapter wires `useSyncExternalStore`'s server snapshot
 *   to `api.getInitialState()` — i.e., the state captured at `createStore()`
 *   time, *before* any `set()` calls. A module-singleton store seeded by a
 *   `set()` in the render body therefore SSRs with empty defaults, causing
 *   the EmptyState flash on hard reload. A per-mount store created *with*
 *   the page's `initialState` baked in lets `getInitialState()` return the
 *   populated state, so the SSR HTML already shows the zone rows.
 *
 * localStorage prefs (overlay, workingHours) layer on after mount because they
 * require `window`. URL state still wins on overlap — `initialState` is
 * re-applied last.
 */
export function ConverterStateProvider({ initialState, children }: Props) {
  const storeRef = useRef<ReturnType<typeof createConverterStore> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createConverterStore(initialState ?? {});
  }
  const store = storeRef.current;

  // Mount-only by design. StrictMode's dev double-invoke runs cleanup-then-
  // remount; the cleanup unsubscribes, the remount re-subscribes — no
  // effectRan ref needed, and persistence stays wired in dev.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only by design
  useEffect(() => {
    const persisted = loadPersistedPrefs();
    if (persisted) {
      // URL state wins on overlap (e.g., the URL's `?f=24` should override
      // any persisted format). `initialState` is re-applied last so the
      // merge order is: defaults < persisted < initialState.
      store.getState().initialize({
        ...persisted,
        ...(initialState ?? {}),
      });
    }

    const unsubscribe = attachPersistence(store);
    return () => {
      unsubscribe?.();
    };
  }, []);

  return (
    <ConverterStoreProvider value={store}>
      {/* useSearchParams() needs a Suspense boundary to keep the rest of the
          tree statically prerenderable — without it, the entire `/convert/*`
          route falls back to CSR and `revalidate` is silently dropped. */}
      <Suspense fallback={null}>
        <SearchParamsHydrator />
      </Suspense>
      <UrlSync />
      {children}
    </ConverterStoreProvider>
  );
}

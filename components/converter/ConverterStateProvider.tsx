'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ConverterState } from '@/lib/store/converter';
import { useConverterStore } from '@/lib/store/converter';
import { attachPersistence, loadPersistedPrefs } from '@/lib/store/persistence';
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
 * Bootstrap is intentionally split three ways:
 *
 *   1. The FIRST provider render in a given environment (server, or initial
 *      client hydration) runs initialize() synchronously in the render body
 *      so the store is populated BEFORE the SSR HTML serializes — and the
 *      client's hydration render output matches it. No other subscribers
 *      exist yet at this point, so the set() is harmless.
 *
 *   2. Subsequent provider mounts on the client (route navigation) defer
 *      initialize() to useLayoutEffect. The previous route's subscribers are
 *      still active during the new tree's render under concurrent rendering,
 *      so calling set() in the render body would trip React's "Cannot update
 *      a component while rendering a different component" warning. Layout
 *      effect (vs effect) keeps the new tree's first paint correct.
 *
 *   3. The useEffect layers in localStorage prefs (format, overlay,
 *      workingHours), which must wait for `window`. `initialState` is
 *      re-applied last so URL state still wins on overlap.
 *
 * Known limitation: the Zustand store is module-singleton. On Cloudflare
 * Workers each request runs in (potentially) the same isolate, so state from
 * a prior request can survive. Today's `initialize` does a partial merge — if
 * a future request omits a field, the prior value leaks. Address when it
 * causes a visible bug; for now G3's URL always supplies the load-bearing
 * fields (zones, homeZoneIndex).
 */

// Module-level: has any provider instance already initialized on this client?
// Distinguishes the very first hydration render (no subscribers — safe to
// set() in render) from subsequent client navigations (prior route's
// subscribers still mounted — must defer to a layout effect).
let clientInitialized = false;

export function ConverterStateProvider({ initialState, children }: Props) {
  const initMode = useRef<'pending' | 'sync' | 'deferred'>('pending');
  const effectRan = useRef(false);

  if (initMode.current === 'pending') {
    const isServer = typeof window === 'undefined';
    if (isServer || !clientInitialized) {
      useConverterStore.getState().initialize(initialState ?? {});
      if (!isServer) clientInitialized = true;
      initMode.current = 'sync';
    } else {
      initMode.current = 'deferred';
    }
  }

  // initialState identity changes on every parent render; we intentionally
  // only re-init on mount of a deferred-mode provider (route navigation).
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only by design
  useLayoutEffect(() => {
    // Skip if init already happened synchronously in the render body.
    if (initMode.current === 'sync') return;
    useConverterStore.getState().initialize(initialState ?? {});
  }, []);

  useEffect(() => {
    if (effectRan.current) return;
    effectRan.current = true;

    const persisted = loadPersistedPrefs();
    if (persisted) {
      useConverterStore.getState().initialize({
        ...persisted,
        ...(initialState ?? {}),
      });
    }

    const unsubscribe = attachPersistence();
    return () => {
      unsubscribe?.();
    };
  }, [initialState]);

  return (
    <>
      <UrlSync />
      {children}
    </>
  );
}

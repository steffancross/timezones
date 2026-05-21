'use client';

import { useEffect, useRef } from 'react';
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
 * Bootstrap is intentionally split:
 *
 *   1. Synchronous init runs in the render body so the store is populated
 *      BEFORE SSR HTML serializes. URL-derived zones and anchor appear in the
 *      first paint instead of after a hydration tick. Safe because
 *      `initialize` is a pure set() — Strict Mode double-render is harmless.
 *
 *   2. The effect layers in localStorage prefs (format, overlay, workingHours),
 *      which must wait for `window`. `initialState` is re-applied last so URL
 *      state still wins on overlap.
 *
 * Known limitation: the Zustand store is module-singleton. On Cloudflare
 * Workers each request runs in (potentially) the same isolate, so state from
 * a prior request can survive. Today's `initialize` does a partial merge — if
 * a future request omits a field, the prior value leaks. Address when it
 * causes a visible bug; for now G3's URL always supplies the load-bearing
 * fields (zones, homeZoneIndex).
 */
export function ConverterStateProvider({ initialState, children }: Props) {
  const ssrInitialized = useRef(false);
  const effectRan = useRef(false);

  if (!ssrInitialized.current) {
    ssrInitialized.current = true;
    useConverterStore.getState().initialize(initialState ?? {});
  }

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

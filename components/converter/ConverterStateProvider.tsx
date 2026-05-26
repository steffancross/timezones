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
 * Cross-request isolation: the Zustand store is a module singleton, so on
 * Cloudflare Workers and Node dev servers it survives across requests in the
 * same isolate. `initialize` resets to module defaults before applying the
 * caller's partial — fields omitted by a later request can't inherit values
 * from a prior one.
 */

// Module-level: has any provider instance already initialized on this client?
// Distinguishes the very first hydration render (no subscribers — safe to
// set() in render) from subsequent client navigations (prior route's
// subscribers still mounted — must defer to a layout effect).
let clientInitialized = false;

export function ConverterStateProvider({ initialState, children }: Props) {
  const initMode = useRef<'pending' | 'sync' | 'deferred'>('pending');

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
    // Load persisted prefs synchronously here (not just in useEffect) so the
    // new route's initialize() preserves overlay/workingHours instead of
    // resetting them to module defaults. Without this, the previous route's
    // persistence subscriber — still attached during this layout effect, since
    // its useEffect cleanup runs *after* the new tree's layout effects —
    // observes the reset-to-defaults and overwrites localStorage with
    // defaults before the new tree's useEffect can restore from it.
    const persisted = loadPersistedPrefs();
    useConverterStore.getState().initialize({
      ...(persisted ?? {}),
      ...(initialState ?? {}),
    });
  }, []);

  // Mount-only by design. Don't add a guard ref (`effectRan`-style) to skip
  // re-runs — StrictMode's dev double-invoke runs cleanup-then-remount with
  // refs preserved, so the second invocation would early-return without
  // re-attaching the subscriber, leaving persistence silently broken in dev.
  // Empty deps + a real cleanup let StrictMode unsubscribe and resubscribe
  // cleanly; production has only one mount either way.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only by design
  useEffect(() => {
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
  }, []);

  return (
    <>
      <UrlSync />
      {children}
    </>
  );
}

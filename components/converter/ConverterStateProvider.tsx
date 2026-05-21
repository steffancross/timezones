'use client';

import { useEffect, useRef } from 'react';
import { useConverterStore } from '@/lib/store/converter';
import { attachPersistence, loadPersistedPrefs } from '@/lib/store/persistence';
import { UrlSync } from './UrlSync';
import type { ConverterState } from '@/lib/store/converter';

interface Props {
  /**
   * Per-page initial state — usually parsed from the URL (zones, anchor) on
   * pair/city pages, or {} on the free-form landing page. URL state takes
   * precedence over persisted prefs where both supply the same field.
   */
  initialState?: Partial<ConverterState>;
  children: React.ReactNode;
}

export function ConverterStateProvider({ initialState, children }: Props) {
  const initialize = useConverterStore((s) => s.initialize);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const persisted = loadPersistedPrefs();
    initialize({
      ...(persisted ?? {}),
      ...(initialState ?? {}),
    });

    const unsubscribe = attachPersistence();
    return () => {
      unsubscribe?.();
    };
  }, [initialize, initialState]);

  return (
    <>
      <UrlSync />
      {children}
    </>
  );
}

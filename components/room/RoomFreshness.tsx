'use client';

// Fetch-on-focus freshness (spec 7c). When the tab regains focus, refetch the
// room state — throttled, no sockets, no polling — and reconcile it into the
// store without clobbering your unsaved paint. A failed refetch shows a quiet,
// recoverable banner (spec 7b's technical error state); everything is preserved
// and Retry re-runs it. Renders nothing in the happy path.

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchRoomState } from '@/lib/rooms/client';
import { useRoomStoreApi } from './room-store-context';

const MIN_REFETCH_MS = 15_000; // throttle: don't refetch on every micro-focus

export function RoomFreshness() {
  const api = useRoomStoreApi();
  const lastFetch = useRef(0);
  const inFlight = useRef(false);
  const [error, setError] = useState(false);

  const refetch = useCallback(
    async (force = false) => {
      if (inFlight.current) return;
      const now = Date.now();
      if (!force && now - lastFetch.current < MIN_REFETCH_MS) return;
      inFlight.current = true;
      lastFetch.current = now;
      try {
        const incoming = await fetchRoomState(api.getState().state.room.id);
        api.getState().reconcileServerState(incoming);
        setError(false);
      } catch {
        setError(true);
      } finally {
        inFlight.current = false;
      }
    },
    [api],
  );

  useEffect(() => {
    const onFocus = () => void refetch();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refetch();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refetch]);

  if (!error) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 border-b border-border bg-[hsl(var(--card))] px-3 py-1.5 text-xs text-foreground shadow-sm">
      <span>Couldn't refresh the room.</span>
      <button
        type="button"
        onClick={() => void refetch(true)}
        className="font-medium text-[var(--brand)] underline underline-offset-2"
      >
        Retry
      </button>
    </div>
  );
}

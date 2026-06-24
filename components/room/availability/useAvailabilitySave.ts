'use client';

// Optimistic, debounced save for your availability. Paint updates local draft
// instantly; this coalesces strokes into one PATCH ~700ms after the last edit
// (and flushes on unmount). On success it merges the saved blob into the room
// store so the Team/Overview tabs reflect it; on failure it keeps the draft and
// marks `unsaved` for retry on the next stroke.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRoomStoreApi } from '@/components/room/room-store-context';
import type { SlotState } from '@/lib/rooms/compute';
import { writeAvailabilityRequest } from '@/lib/rooms/client';

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved';
type Draft = { week: SlotState[]; overrides: Record<string, SlotState[]> };

const DEBOUNCE_MS = 700;

export function useAvailabilitySave(roomId: string) {
  const api = useRoomStoreApi();
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Draft | null>(null);

  // Mirror save status into the store so a focus refetch (spec 7c) knows not to
  // clobber paint that's still unsaved or in flight.
  useEffect(() => {
    api.getState().setDirty(status === 'unsaved' || status === 'saving');
  }, [api, status]);

  const flush = useCallback(async () => {
    const draft = pending.current;
    if (!draft) return;
    pending.current = null;
    setStatus('saving');

    const generalWeek = draft.week.join('');
    const set: Record<string, string> = {};
    for (const [date, day] of Object.entries(draft.overrides)) set[date] = day.join('');

    // Clear any committed dates the draft no longer has (e.g. after a reset).
    const youId = api.getState().youId;
    const committed = youId
      ? (api.getState().state.participants.find((p) => p.id === youId)?.overrides ?? {})
      : {};
    const clear = Object.keys(committed).filter((d) => !(d in draft.overrides));

    try {
      await writeAvailabilityRequest(roomId, { generalWeek, overrides: { set, clear } });
      api.getState().applyMyAvailability({ generalWeek, overrides: set });
      setStatus('saved');
    } catch {
      setStatus('unsaved');
    }
  }, [api, roomId]);

  const save = useCallback(
    (week: SlotState[], overrides: Record<string, SlotState[]>) => {
      pending.current = { week, overrides };
      setStatus('unsaved');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
    },
    [flush],
  );

  // Best-effort flush on unmount / navigate-away.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      void flush();
    },
    [flush],
  );

  return { status, save };
}

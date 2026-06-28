'use client';

// Seeds the room-data context from the page's SSR props and owns the small bits
// of shared view state (viewed week, selected set). Heavy compute is memoized on
// (state, viewerTz, weekAnchor, selected) — note `now` is deliberately NOT a dep
// (project/aggregate don't use it), so the per-minute tick never re-projects.

import { useCallback, useMemo, useState } from 'react';
import { aggregate, currentWeekAnchor, project } from '@/lib/rooms/compute';
import type { RoomState } from '@/lib/rooms/db';
import { useNow } from '@/lib/hooks/useNow';
import { RoomDataContextProvider, type RoomDataValue } from './room-data-context';

interface Props {
  state: RoomState;
  youId: string | null;
  viewerTz: string;
  /** Override the initial viewed week (Sunday). Defaults to the current week. */
  initialWeekAnchor?: string;
  children: React.ReactNode;
}

export function RoomDataProvider({ state, youId, viewerTz, initialWeekAnchor, children }: Props) {
  const now = useNow('minute').toMillis();

  // Default to the current week; lazy init so it's stable across renders.
  const [weekAnchor, setWeekAnchor] = useState(
    () => initialWeekAnchor ?? currentWeekAnchor(viewerTz, Date.now()),
  );
  // Default: everyone in the aggregate.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(state.participants.map((p) => p.id)),
  );

  const toggleSelected = useCallback((participantId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(participantId)) next.delete(participantId);
      else next.add(participantId);
      return next;
    });
  }, []);

  // Sorted id list — a stable dep that only changes when the chosen set does.
  const selectedIds = useMemo(() => [...selected].sort(), [selected]);

  // project()/aggregate() don't read `now` (only windows/status do, downstream),
  // so it's deliberately not part of this memo — the per-minute tick never
  // re-projects the grid. `now: 0` is an unused placeholder for the input shape.
  const { projection, grid } = useMemo(() => {
    const proj = project({ room: state, viewerTz, weekAnchor, now: 0, selected: selectedIds });
    return { projection: proj, grid: aggregate(proj) };
  }, [state, viewerTz, weekAnchor, selectedIds]);

  const value: RoomDataValue = {
    state,
    youId,
    viewerTz,
    weekAnchor,
    selected,
    now,
    projection,
    grid,
    setWeekAnchor,
    toggleSelected,
  };

  return <RoomDataContextProvider value={value}>{children}</RoomDataContextProvider>;
}

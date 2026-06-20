'use client';

// Team tab — orchestrates the week heatmap / day view, the roster sidebar, paging,
// and the compress control. Holds Team-local UI state (zoom, compressed, hover,
// manually-expanded folds, day index); the heavy projection/aggregate come
// already-memoized from the room-data provider, so hover never re-projects.

import { ChevronLeft, ChevronRight, FoldVertical, UnfoldVertical } from 'lucide-react';
import { useMemo, useState } from 'react';
import { currentWeekAnchor, rowSegments } from '@/lib/rooms/compute';
import { contentPhase, respondedParticipants } from '@/lib/rooms/content-state';
import { DateTime } from '@/lib/time/luxon';
import { cn } from '@/lib/utils';
import { JustYouSoFar } from '../JustYouSoFar';
import { RespondersNote } from '../RespondersNote';
import { RoomGetStarted } from '../RoomGetStarted';
import { useRoomStore } from '../room-store-context';
import { DayView } from './DayView';
import { Legend } from './Legend';
import { RosterSidebar } from './RosterSidebar';
import { buildWeekColumns } from './slots';
import { type HoverCell, WeekHeatmap } from './WeekHeatmap';

function weekLabel(weekAnchor: string): string {
  const start = DateTime.fromISO(weekAnchor);
  const end = start.plus({ days: 6 });
  return start.month === end.month
    ? `${start.toFormat('MMM d')}–${end.toFormat('d')}`
    : `${start.toFormat('MMM d')} – ${end.toFormat('MMM d')}`;
}

export function TeamTab({ onAddAvailability }: { onAddAvailability?: () => void }) {
  const grid = useRoomStore((s) => s.grid);
  const weekAnchor = useRoomStore((s) => s.weekAnchor);
  const viewerTz = useRoomStore((s) => s.viewerTz);
  const now = useRoomStore((s) => s.now);
  const setWeekAnchor = useRoomStore((s) => s.setWeekAnchor);
  const participants = useRoomStore((s) => s.state.participants);
  const youId = useRoomStore((s) => s.youId);

  const [zoom, setZoom] = useState<'week' | 'day'>('week');
  const [compressed, setCompressed] = useState(true);
  const [manuallyExpanded, setManuallyExpanded] = useState<Set<string>>(() => new Set());
  const [hover, setHover] = useState<HoverCell>(null);

  const columns = useMemo(() => buildWeekColumns(weekAnchor), [weekAnchor]);
  const segments = useMemo(() => rowSegments(grid.grade), [grid]);

  // Default the day view to today if it's in the viewed week, else Sunday.
  const todayIso = DateTime.fromMillis(now).setZone(viewerTz).toISODate();
  const [dayIndex, setDayIndex] = useState(() => {
    const idx = buildWeekColumns(weekAnchor).findIndex((c) => c.iso === todayIso);
    return idx === -1 ? 0 : idx;
  });

  // Current week is the floor — no paging into the past.
  const floor = currentWeekAnchor(viewerTz, now);
  const canPrev = weekAnchor > floor;
  const pageWeek = (delta: number) => {
    const next = DateTime.fromISO(weekAnchor)
      .plus({ days: delta * 7 })
      .toISODate();
    if (!next || (delta < 0 && next < floor)) return;
    setWeekAnchor(next);
  };

  const expandFold = (key: string) => setManuallyExpanded((prev) => new Set(prev).add(key));

  // Treat "anything currently open" as expanded, so the toggle reflects what the
  // user sees — not just the `compressed` flag (which a manual expand bypasses).
  const isExpanded = !compressed || manuallyExpanded.size > 0;

  // Authoritative: one click always does the visible thing. Collapsing clears any
  // manual expands so it fully re-collapses. (Manual expands still persist across
  // recomputes — only this toggle resets them.)
  const toggleCompress = () => {
    setManuallyExpanded(new Set());
    setCompressed(isExpanded); // expanded → collapse (true); collapsed → expand (false)
  };

  // Cold-start states (spec 7b): an empty room is a get-started, not a blank grid;
  // a one-responder room shows that person's own week (never an all-green
  // "everyone" consensus). The normal aggregate is the 2+-responder case.
  const phase = contentPhase(participants);
  const you = youId ? participants.find((p) => p.id === youId) : undefined;

  if (phase === 'empty') {
    return (
      <div className="flex flex-col p-4">
        <RoomGetStarted onAddAvailability={onAddAvailability} />
      </div>
    );
  }

  if (phase === 'solo') {
    return (
      <div className="flex flex-col p-4">
        <JustYouSoFar youResponded={!!you?.hasResponded} onAddAvailability={onAddAvailability} />
        <WeekHeatmap
          grid={grid}
          columns={columns}
          segments={segments}
          compressed={compressed}
          manuallyExpanded={manuallyExpanded}
          onExpandFold={expandFold}
          variant="solo"
        />
        <Legend variant="solo" />
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4">
      {/* header */}
      <div className="mb-3 flex items-center gap-2">
        {zoom === 'week' && (
          <>
            <button
              type="button"
              aria-label="Previous week"
              onClick={() => pageWeek(-1)}
              disabled={!canPrev}
              className="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-[var(--hover)] disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-semibold tracking-tight">{weekLabel(weekAnchor)}</span>
            <button
              type="button"
              aria-label="Next week"
              onClick={() => pageWeek(1)}
              className="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-[var(--hover)]"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        )}

        <span className="flex-1" />

        {/* Compress is a week-view concern; the day view is always full-24h scroll. */}
        {zoom === 'week' && (
          <button
            type="button"
            onClick={toggleCompress}
            aria-label={isExpanded ? 'Collapse dead hours' : 'Show full 24 hours'}
            title={isExpanded ? 'Collapse dead hours' : 'Show full 24 hours'}
            className="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-[var(--hover)]"
          >
            {isExpanded ? (
              <FoldVertical className="size-4" />
            ) : (
              <UnfoldVertical className="size-4" />
            )}
          </button>
        )}

        <div className="inline-flex overflow-hidden rounded-md border border-border text-xs">
          {(['week', 'day'] as const).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(z)}
              className={cn(
                'px-2.5 py-1 capitalize',
                zoom === z ? 'bg-[var(--brand)] text-[var(--brand-fg)]' : 'hover:bg-[var(--hover)]',
              )}
            >
              {z}
            </button>
          ))}
        </div>
      </div>

      {/* body */}
      {zoom === 'week' ? (
        <div className="flex">
          <div className="min-w-0 flex-1">
            <WeekHeatmap
              grid={grid}
              columns={columns}
              segments={segments}
              compressed={compressed}
              manuallyExpanded={manuallyExpanded}
              onExpandFold={expandFold}
              hover={hover}
              onHover={setHover}
            />
          </div>
          <RosterSidebar hover={hover} columns={columns} />
        </div>
      ) : (
        <DayView
          dayIndex={dayIndex}
          columns={columns}
          onPageDay={(delta) => setDayIndex((i) => Math.min(6, Math.max(0, i + delta)))}
        />
      )}

      <div className="mt-1 flex items-center justify-between">
        <RespondersNote count={respondedParticipants(participants).length} />
      </div>
      <Legend />
    </div>
  );
}

'use client';

// Team tab — orchestrates the week heatmap / day view, the roster sidebar, paging,
// and the compress control. Holds Team-local UI state (zoom, compressed, hover,
// manually-expanded folds, day index); the heavy projection/aggregate come
// already-memoized from the room-data provider, so hover never re-projects.

import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';
import {
  buildIcs,
  downloadIcs,
  googleCalendarUrl,
  selectionToMillis,
} from '@/lib/rooms/calendar-export';
import { currentWeekAnchor, rowSegments } from '@/lib/rooms/compute';
import { contentPhase, respondedParticipants } from '@/lib/rooms/content-state';
import { formatDuration } from '@/lib/time/format';
import { DateTime } from '@/lib/time/luxon';
import { cn } from '@/lib/utils';
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  FoldVertical,
  UnfoldVertical,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { JustYouSoFar } from '../JustYouSoFar';
import { RespondersNote } from '../RespondersNote';
import { useRoomStore } from '../room-store-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RoomGetStarted } from '../RoomGetStarted';
import { BreakdownSheet } from './BreakdownSheet';
import { DayView } from './DayView';
import { Legend } from './Legend';
import { NoOverlapCard } from './NoOverlapCard';
import { RosterChips } from './RosterChips';
import { RosterSidebar } from './RosterSidebar';
import { buildWeekColumns, slotLabel } from './slots';
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
  const roomName = useRoomStore((s) => s.state.room.name);

  const projection = useRoomStore((s) => s.projection);
  const colorMode = useRoomStore((s) => s.colorMode);
  const setColorMode = useRoomStore((s) => s.setColorMode);

  const isMobile = useIsMobile();
  const [zoom, setZoom] = useState<'week' | 'day'>('week');
  const [selectMode, setSelectMode] = useState(false);
  const [selection, setSelection] = useState<{
    day: number;
    startSlot: number;
    endSlot: number;
  } | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [compressed, setCompressed] = useState(true);
  const [manuallyExpanded, setManuallyExpanded] = useState<Set<string>>(() => new Set());
  const [hover, setHover] = useState<HoverCell>(null);
  const [sheetCell, setSheetCell] = useState<HoverCell>(null);
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const [dayHoverSlot, setDayHoverSlot] = useState<number | null>(null);

  const highlightGrid = useMemo(
    () => projection.participants.find((p) => p.participantId === hoveredMemberId)?.grid ?? null,
    [hoveredMemberId, projection],
  );

  const columns = useMemo(() => buildWeekColumns(weekAnchor), [weekAnchor]);
  const segments = useMemo(() => rowSegments(grid.grade), [grid]);
  const allFolded =
    colorMode === 'consensus' && compressed && segments.length === 1 && !!segments[0]?.fold;

  const heatmapLevels = useMemo(() => {
    if (colorMode !== 'heatmap') return null;
    const parts = projection.participants;
    const n = parts.length;
    if (n === 0) return null;
    return Array.from({ length: 7 }, (_, d) =>
      Array.from({ length: 48 }, (_, k) => {
        const canMake = parts.filter((p) => (p.grid[d]?.[k] ?? 'n') !== 'n').length;
        return canMake === 0 ? 0 : Math.ceil((canMake / n) * 5);
      }),
    );
  }, [colorMode, projection]);

  // Default the day view to today if it's in the viewed week, else Sunday.
  const todayIso = DateTime.fromMillis(now).setZone(viewerTz).toISODate();
  const [dayIndex, setDayIndex] = useState(() => {
    const idx = buildWeekColumns(weekAnchor).findIndex((c) => c.iso === todayIso);
    return idx === -1 ? 0 : idx;
  });

  const dayHoverCell: HoverCell =
    dayHoverSlot !== null ? { day: dayIndex, slot: dayHoverSlot } : null;

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

  const handleRangeSelect = (day: number, startSlot: number, endSlot: number) => {
    setSelection({ day, startSlot, endSlot });
    // Stay in selectMode so the user can re-drag to adjust before confirming.
  };

  const handleConfirmSchedule = () => {
    if (!selection) return;
    if (!eventTitle) setEventTitle(roomName ?? '');
    setPopoverOpen(true);
  };

  const handleCancel = () => {
    setSelectMode(false);
    setPopoverOpen(false);
    setSelection(null);
    setEventTitle('');
  };

  const handleGoogleCalendar = () => {
    if (!selection) return;
    const { startMs, endMs } = selectionToMillis(
      weekAnchor,
      viewerTz,
      selection.day,
      selection.startSlot,
      selection.endSlot,
    );
    const url = googleCalendarUrl(
      eventTitle || roomName || 'Team meeting',
      startMs,
      endMs,
      viewerTz,
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadIcs = () => {
    if (!selection) return;
    const { startMs, endMs } = selectionToMillis(
      weekAnchor,
      viewerTz,
      selection.day,
      selection.startSlot,
      selection.endSlot,
    );
    const title = eventTitle || roomName || 'Team meeting';
    const content = buildIcs(title, startMs, endMs, viewerTz);
    downloadIcs(content, `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`);
  };

  const selectionLabel = selection
    ? (() => {
        const col = columns[selection.day];
        if (!col) return '';
        const dateStr = DateTime.fromISO(col.iso).toFormat('ccc, MMM d');
        const startStr = slotLabel(selection.startSlot);
        const endStr = slotLabel(selection.endSlot + 1);
        const dur = formatDuration((selection.endSlot - selection.startSlot + 1) * 30);
        return `${dateStr} · ${startStr} – ${endStr} (${dur})`;
      })()
    : '';

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
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center">
        {/* Row 1: week / day navigation */}
        <div className="flex items-center gap-2">
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
          {zoom === 'day' && (
            <>
              <button
                type="button"
                aria-label="Previous day"
                onClick={() => {
                  setDayIndex((i) => Math.max(0, i - 1));
                  setDayHoverSlot(null);
                }}
                disabled={dayIndex === 0}
                className="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-[var(--hover)] disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-sm font-semibold tracking-tight">
                {columns[dayIndex]
                  ? `${columns[dayIndex].label} · ${DateTime.fromISO(columns[dayIndex].iso).toFormat('MMM d')}`
                  : ''}
              </span>
              <button
                type="button"
                aria-label="Next day"
                onClick={() => {
                  setDayIndex((i) => Math.min(6, i + 1));
                  setDayHoverSlot(null);
                }}
                disabled={dayIndex === 6}
                className="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-[var(--hover)] disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </>
          )}
        </div>

        <span className="hidden flex-1 md:block" />

        {/* Row 2 (mobile) / right side (desktop): view toggles */}
        <div className="flex items-center gap-2">
          {/* Compress is a week-view/consensus concern; heatmap always shows all rows. */}
          {zoom === 'week' && colorMode === 'consensus' && (
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

          <TooltipProvider>
            <div className="inline-flex overflow-hidden rounded-md border border-border text-xs">
              {(
                [
                  { mode: 'consensus', tip: 'Only shows slots where everyone is free' },
                  { mode: 'heatmap', tip: 'Shades each slot by how many people can make it' },
                ] as const
              ).map(({ mode: m, tip }) => (
                <Tooltip key={m}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={zoom === 'day'}
                      onClick={() => setColorMode(m)}
                      className={cn(
                        'px-2.5 py-1 capitalize',
                        colorMode === m && zoom === 'week'
                          ? 'bg-[var(--brand)] text-[var(--brand-fg)]'
                          : 'hover:bg-[var(--hover)]',
                        zoom === 'day' && 'cursor-not-allowed opacity-40',
                      )}
                    >
                      {m}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{tip}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>

          <div className="inline-flex overflow-hidden rounded-md border border-border text-xs">
            {(['week', 'day'] as const).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoom(z)}
                className={cn(
                  'px-2.5 py-1 capitalize',
                  zoom === z
                    ? 'bg-[var(--brand)] text-[var(--brand-fg)]'
                    : 'hover:bg-[var(--hover)]',
                )}
              >
                {z}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* body */}
      {zoom === 'week' ? (
        <>
          <div className="flex">
            <div className="min-w-0 flex-1">
              {allFolded ? (
                <NoOverlapCard
                  onShowGrid={() => setCompressed(false)}
                  onSwitchHeatmap={() => setColorMode('heatmap')}
                />
              ) : (
                <WeekHeatmap
                  grid={grid}
                  columns={columns}
                  segments={segments}
                  compressed={compressed}
                  manuallyExpanded={manuallyExpanded}
                  onExpandFold={expandFold}
                  hover={hover}
                  onHover={setHover}
                  onCellTap={isMobile ? (cell) => setSheetCell(cell) : undefined}
                  highlightGrid={highlightGrid}
                  selectMode={selectMode}
                  onRangeSelect={handleRangeSelect}
                  highlightRange={selection}
                  heatmapLevels={heatmapLevels}
                />
              )}
            </div>
            {/* Desktop: hover breakdown rail. Mobile: chip-row + tap sheet (below). */}
            <div className="hidden md:block">
              <RosterSidebar
                hover={allFolded ? null : hover}
                columns={columns}
                onMemberHover={setHoveredMemberId}
                hoveredMemberId={hoveredMemberId}
              />
            </div>
          </div>
          <div className="md:hidden">
            <RosterChips />
          </div>
        </>
      ) : (
        <>
          <div className="flex">
            <div className="min-w-0 flex-1">
              <DayView
                dayIndex={dayIndex}
                columns={columns}
                selectMode={selectMode}
                onRangeSelect={(s, e) => handleRangeSelect(dayIndex, s, e)}
                highlightRange={
                  selection && selection.day === dayIndex
                    ? { startSlot: selection.startSlot, endSlot: selection.endSlot }
                    : undefined
                }
                onHoverSlot={setDayHoverSlot}
              />
            </div>
            <div className="hidden md:block">
              <RosterSidebar
                hover={dayHoverCell}
                columns={columns}
                onMemberHover={setHoveredMemberId}
                hoveredMemberId={hoveredMemberId}
              />
            </div>
          </div>
          <div className="md:hidden">
            <RosterChips />
          </div>
        </>
      )}

      <div className="mt-1 flex items-center justify-between">
        <RespondersNote count={respondedParticipants(participants).length} />
      </div>
      <div className="flex items-center justify-between">
        <Legend variant={zoom === 'week' && colorMode === 'heatmap' ? 'heatmap' : 'group'} />
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverAnchor asChild>
            <div className="flex flex-col items-end gap-1">
              {selectMode ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="inline-flex shrink-0 items-center rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-[var(--hover)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSchedule}
                    disabled={!selection}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      selection
                        ? 'bg-[var(--brand)] text-[var(--brand-fg)] hover:opacity-90'
                        : 'cursor-not-allowed bg-muted text-muted-foreground opacity-50',
                    )}
                  >
                    <CalendarPlus className="size-3" />
                    Schedule
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectMode(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[var(--brand)] px-2.5 py-1 text-xs font-medium text-[var(--brand-fg)] hover:opacity-90"
                >
                  <CalendarPlus className="size-3" />
                  Schedule event
                </button>
              )}
              {selectMode && (
                <p className="text-[11px] text-muted-foreground">
                  {zoom === 'week'
                    ? 'Drag within a day column to select.'
                    : 'Drag to select a time range.'}
                </p>
              )}
            </div>
          </PopoverAnchor>
          <PopoverContent align="end" className="w-72 space-y-3 p-4">
            {selection && (
              <>
                <p className="text-sm font-medium">{selectionLabel}</p>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder={roomName ?? 'Event title'}
                  className="w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleGoogleCalendar}
                    className="flex-1 rounded-md bg-[var(--brand)] px-3 py-1.5 text-xs font-medium text-[var(--brand-fg)] hover:opacity-90"
                  >
                    Google Calendar
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadIcs}
                    className="flex-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-[var(--hover)]"
                  >
                    .ics file
                  </button>
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Mobile tap-to-inspect breakdown (no-op on desktop — only opened by onCellTap). */}
      <BreakdownSheet cell={sheetCell} columns={columns} onClose={() => setSheetCell(null)} />
    </div>
  );
}

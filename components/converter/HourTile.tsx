'use client';

import { useCallback } from 'react';
import {
  extendDrag,
  isDragging,
  startNewDrag,
  startResizeDrag,
} from '@/lib/converter/drag-selection';
import { useConverterStore } from '@/lib/store/converter';
import { formatHourTile, type TimeFormat } from '@/lib/time/format';
import { cn } from '@/lib/utils';
import type { ColumnData } from './HourStrip';

// Tiles are interactive. Pointer-down on the tile body starts a fresh range
// (single click = 1-wide block, drag = wider block). The leftmost and rightmost
// tiles of the active range carry small edge handles; grabbing one resizes
// that edge while the opposite edge stays pinned. Hover still fires a
// cross-row preview keyed on `column.homeHour`.

interface Props {
  column: ColumnData;
  columnIndex: number;
  format: TimeFormat;
  isOffDay: boolean;
  isCurrentHour: boolean;
  /** When true, recolor tick + label to the warm "weekend" palette. */
  isWeekend: boolean;
}

/**
 * One column of the hour strip.
 *
 * Anchor/preview alignment is keyed on `column.homeHour` (the home zone's
 * local hour for this column), not on the row's local hour. That way the same
 * home-hour preview reads as "aligned" on every row — hovering any tile
 * highlights the same column index across all rows.
 */
export function HourTile({
  column,
  columnIndex,
  format,
  isOffDay,
  isCurrentHour,
  isWeekend,
}: Props) {
  const anchorHour = useConverterStore((s) => s.anchorHour);
  const anchorEndHour = useConverterStore((s) => s.anchorEndHour);
  const previewHour = useConverterStore((s) => s.previewHour);
  const setPreviewHour = useConverterStore((s) => s.setPreviewHour);

  // Normalize the anchor range: when anchorEndHour is null, the block is
  // 1 tile wide at anchorHour. Callers (URL, tests) that only set anchorHour
  // get the legacy single-tile behavior for free.
  const rangeStart = anchorHour;
  const rangeEnd = anchorHour === null ? null : (anchorEndHour ?? anchorHour);
  const isInRange =
    rangeStart !== null &&
    rangeEnd !== null &&
    column.homeHour >= rangeStart &&
    column.homeHour <= rangeEnd;
  const isRangeStart = isInRange && column.homeHour === rangeStart;
  const isRangeEnd = isInRange && column.homeHour === rangeEnd;
  const isPreviewAligned = previewHour !== null && !isInRange && previewHour === column.homeHour;
  const isMajorTick = columnIndex % 6 === 0;

  const handlePointerEnter = useCallback(() => {
    setPreviewHour(column.homeHour);
    if (isDragging()) extendDrag(column.homeHour);
  }, [column.homeHour, setPreviewHour]);

  const handlePointerLeave = useCallback(() => {
    if (!isDragging()) setPreviewHour(null);
  }, [setPreviewHour]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Only react to the primary button for mouse; touch/pen always pass.
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      setPreviewHour(column.homeHour);
      startNewDrag(column.homeHour);
    },
    [column.homeHour, setPreviewHour],
  );

  const handleResizeHandlePointerDown = useCallback(
    (side: 'start' | 'end') => (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // Stop the tile body's pointer-down (which would start a fresh range
      // and discard the existing block).
      e.stopPropagation();
      startResizeDrag(side);
    },
    [],
  );

  // Tick style per design handoff: transparent tile, bottom-left mono label,
  // vertical tick at the left edge (taller on every 6th column), accent fill
  // across every tile in the active range, accent-soft band on preview.
  // Weekend rows recolor tick + label to a warm amber palette (no tint band).
  const sharedClasses = cn(
    'relative flex h-full items-end justify-start pb-[5px] max-md:pb-[3px] pl-1 font-mono text-[10px] max-md:text-[9px] tracking-[-0.01em] tabular-nums select-none transition-colors',
    // Per-tile baseline composes the strip's bottom rule. Weekend tiles use
    // the warm baseline color so a Fri→Sat boundary mid-row recolors only
    // the Sat portion of the line.
    'border-b',
    isWeekend
      ? 'text-[color:var(--weekend-fg)] border-[color:var(--weekend-base)]'
      : 'text-[color:var(--fg-subtle)] border-[color:var(--border)]',
    // Base minor tick (left edge of each cell). Mobile-compact shrinks
    // 6 → 5px and majors 12 → 9px per Mobile compact spec.
    "before:content-[''] before:absolute before:left-0 before:bottom-0 before:w-px before:h-1.5 max-md:before:h-[5px]",
    isWeekend ? 'before:bg-[color:var(--weekend-tick)]' : 'before:bg-[color:var(--border-strong)]',
    // Major tick every 6 columns: taller + brighter (weekend variant uses --weekend-fg).
    isMajorTick &&
      (isWeekend
        ? 'before:h-3 max-md:before:h-[9px] before:bg-[color:var(--weekend-fg)]'
        : 'before:h-3 max-md:before:h-[9px] before:bg-[color:var(--fg-subtle)]'),
    'hover:text-[color:var(--fg)]',
    // Now: accent-colored tick (overrides minor/major), accent label.
    isCurrentHour &&
      !isInRange &&
      'text-[color:var(--brand)] font-semibold before:!bg-[var(--brand)] before:!h-3.5 max-md:before:!h-[11px] before:!w-0.5',
    // Preview: soft accent band behind tile (suppressed inside the range).
    isPreviewAligned && 'bg-[var(--brand-soft)] text-[color:var(--fg)]',
    // Range fill: solid accent across every tile in [rangeStart, rangeEnd].
    isInRange && 'bg-[var(--brand)] text-[color:var(--brand-fg)] font-semibold before:hidden',
  );

  const content = (
    <>
      {/* +1d / -1d badge above the range-start tile when projection crosses a day */}
      {isRangeStart && column.dayDelta !== 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] font-semibold tracking-[0.04em] text-[color:var(--brand)]"
        >
          {column.dayDelta > 0 ? `+${column.dayDelta}d` : `${column.dayDelta}d`}
        </span>
      )}
      <span
        className={cn(
          isOffDay && !isInRange && 'opacity-[0.55]',
          // Mobile-compact: sparse labels — only every 3rd column shows a
          // label (cols 0,3,6,…). Range tiles keep their label regardless.
          columnIndex % 3 !== 0 && !isInRange && 'max-md:invisible',
        )}
      >
        {formatHourTile(column.localHour, format)}
      </span>

      {/* Edge resize handles. Rendered on the leftmost / rightmost tile of the
          range (both on the same tile when the range is 1 wide). The handle
          straddles the tile boundary so it's easier to grab. */}
      {isRangeStart && (
        <div
          onPointerDown={handleResizeHandlePointerDown('start')}
          className="absolute left-0 top-0 z-10 h-full w-1.5 -translate-x-1/2 cursor-ew-resize"
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-1/2 h-3 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-[1px] bg-[var(--brand-fg)] opacity-90" />
        </div>
      )}
      {isRangeEnd && (
        <div
          onPointerDown={handleResizeHandlePointerDown('end')}
          className="absolute right-0 top-0 z-10 h-full w-1.5 translate-x-1/2 cursor-ew-resize"
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-1/2 h-3 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-[1px] bg-[var(--brand-fg)] opacity-90" />
        </div>
      )}
    </>
  );

  return (
    <div
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      className={sharedClasses}
      data-hour={column.localHour}
      data-home-hour={column.homeHour}
    >
      {content}
    </div>
  );
}

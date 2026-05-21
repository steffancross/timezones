'use client';

import { useCallback } from 'react';
import { useConverterStore } from '@/lib/store/converter';
import { formatHourTile, type TimeFormat } from '@/lib/time/format';
import { cn } from '@/lib/utils';
import type { ColumnData } from './HourStrip';

// Tiles are non-interactive — no click to set anchor. Hover from ANY row
// fires a preview keyed on `column.homeHour`, which lights up the matching
// column on every other row (e.g., hover PST 3pm → EST 6pm tile highlights
// too, because both sit at homeHour=15 in centered mode).

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
  const previewHour = useConverterStore((s) => s.previewHour);
  const setPreviewHour = useConverterStore((s) => s.setPreviewHour);

  const isAnchorAligned = anchorHour !== null && anchorHour === column.homeHour;
  const isPreviewAligned =
    previewHour !== null && previewHour !== anchorHour && previewHour === column.homeHour;
  const isMajorTick = columnIndex % 6 === 0;

  const handlePreviewOn = useCallback(() => {
    setPreviewHour(column.homeHour);
  }, [column.homeHour, setPreviewHour]);

  const handlePreviewOff = useCallback(() => {
    setPreviewHour(null);
  }, [setPreviewHour]);

  // Tick style per design handoff: transparent tile, bottom-left mono label,
  // vertical tick at the left edge (taller on every 6th column), accent fill
  // only on the anchor tile, accent-soft band on preview. Weekend rows
  // recolor tick + label to a warm amber palette (no tint band).
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
      !isAnchorAligned &&
      'text-[color:var(--brand)] font-semibold before:!bg-[var(--brand)] before:!h-3.5 max-md:before:!h-[11px] before:!w-0.5',
    // Preview: soft accent band behind tile.
    isPreviewAligned && !isAnchorAligned && 'bg-[var(--brand-soft)] text-[color:var(--fg)]',
    // Anchor: solid accent fill, tick hidden.
    isAnchorAligned && 'bg-[var(--brand)] text-[color:var(--brand-fg)] font-semibold before:hidden',
  );

  const content = (
    <>
      {/* +1d / -1d badge above the anchor tile when projection crosses a day */}
      {isAnchorAligned && column.dayDelta !== 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] font-semibold tracking-[0.04em] text-[color:var(--brand)]"
        >
          {column.dayDelta > 0 ? `+${column.dayDelta}d` : `${column.dayDelta}d`}
        </span>
      )}
      <span
        className={cn(
          isOffDay && !isAnchorAligned && 'opacity-[0.55]',
          // Mobile-compact: sparse labels — only every 3rd column shows a
          // label (cols 0,3,6,…). Anchor tile keeps its label regardless.
          columnIndex % 3 !== 0 && !isAnchorAligned && 'max-md:invisible',
        )}
      >
        {formatHourTile(column.localHour, format)}
      </span>
    </>
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: tile is intentionally non-interactive in the a11y sense. Pointer handlers provide sighted-user-only hover/touch preview; meaningful state (anchor, current hour) is announced via AnchorPill + Now badge. No keyboard affordance because click/Enter has no effect.
    <div
      onMouseEnter={handlePreviewOn}
      onMouseLeave={handlePreviewOff}
      onPointerDown={handlePreviewOn}
      className={sharedClasses}
      data-hour={column.localHour}
      data-home-hour={column.homeHour}
    >
      {content}
    </div>
  );
}

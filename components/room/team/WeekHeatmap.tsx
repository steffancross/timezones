'use client';

// The week heatmap — the core visualization. 7 Sunday-first day columns × 48
// half-hour rows, colored by the engine's aggregate grade into continuous bands.
// Dead-hour runs render as collapsible fold strips (engine segments); the corner
// control toggles all folds. Anchored positions: every row is ROW_H tall and a
// fold collapses to a fixed strip, so live rows keep their vertical map.

import type { AggregateGrid, Grade, Segment, SlotState } from '@/lib/rooms/compute';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { FoldStrip } from './FoldStrip';
import { hourLabel, ROW_H, type WeekColumn } from './slots';

export type HoverCell = { day: number; slot: number } | null;

const SLIVER = 'repeating-linear-gradient(45deg, var(--border-strong) 0 1px, transparent 1px 4px)'; // spring-forward "clock change" marker — a thin striped cell

function cellBackground(
  grade: Grade,
  gone: boolean,
  variant: 'group' | 'solo',
  highlight?: SlotState | null,
): string {
  if (gone) return SLIVER;
  // Roster-hover mode: show the individual's own state instead of the aggregate.
  if (highlight != null) {
    if (highlight === 'y') return 'var(--av-yes-strong)';
    if (highlight === 's') return 'var(--paint-soft)';
    return 'var(--hm-blank)';
  }
  // Solo (one responder) reads as that person's OWN week, not an "everyone"
  // consensus — vivid paint green, never the aggregate's --hm-all.
  if (grade === 'all') return variant === 'solo' ? 'var(--av-yes-strong)' : 'var(--hm-all)';
  if (grade === 'some') return 'var(--paint-soft)';
  return 'var(--hm-blank)';
}

function cellBackgroundHeatmap(level: number): string {
  if (level === 0) return 'var(--hm-blank)';
  return `var(--hm-l${level})`;
}

const foldKey = (s: Segment) => `${s.from}-${s.to}`;

interface Props {
  grid: AggregateGrid;
  columns: WeekColumn[];
  segments: Segment[];
  compressed: boolean;
  manuallyExpanded: Set<string>;
  onExpandFold: (key: string) => void;
  // Hover-driven breakdown is a group-view affordance; solo passes neither.
  hover?: HoverCell;
  onHover?: (hover: HoverCell) => void;
  // Touch: tapping a cell opens the breakdown sheet (no hover on a phone).
  onCellTap?: (cell: { day: number; slot: number }) => void;
  variant?: 'group' | 'solo';
  // When a roster member is hovered, paint their individual SlotState grid
  // instead of the aggregate. grid[day][slot].
  highlightGrid?: SlotState[][] | null;
  // Drag-to-select mode: disables hover/tap, enables drag range selection.
  selectMode?: boolean;
  onRangeSelect?: (day: number, startSlot: number, endSlot: number) => void;
  // Committed selection — keeps the range highlighted while the export popover is open.
  highlightRange?: { day: number; startSlot: number; endSlot: number } | null;
  // Heatmap mode (spec E): when provided, disables fold logic and colors cells by count.
  // heatmapLevels[day][slot] = 0 (blank) … 5 (everyone can make it).
  heatmapLevels?: number[][] | null;
}

export function WeekHeatmap({
  grid,
  columns,
  segments,
  compressed,
  manuallyExpanded,
  onExpandFold,
  hover = null,
  onHover,
  onCellTap,
  variant = 'group',
  highlightGrid = null,
  selectMode = false,
  onRangeSelect,
  highlightRange = null,
  heatmapLevels = null,
}: Props) {
  const [dragState, setDragState] = useState<{
    day: number;
    startSlot: number;
    currentSlot: number;
  } | null>(null);

  // Active drag takes precedence over committed selection for the highlight.
  const effectiveRange = dragState
    ? {
        day: dragState.day,
        startSlot: Math.min(dragState.startSlot, dragState.currentSlot),
        endSlot: Math.max(dragState.startSlot, dragState.currentSlot),
      }
    : (highlightRange ?? null);

  function cellFromPoint(x: number, y: number): { day: number; slot: number } | null {
    const el = document.elementFromPoint(x, y);
    const cell = el?.closest('[data-day][data-slot]');
    if (!cell) return null;
    const day = Number((cell as HTMLElement).dataset.day);
    const slot = Number((cell as HTMLElement).dataset.slot);
    if (Number.isNaN(day) || Number.isNaN(slot)) return null;
    return { day, slot };
  }

  return (
    <div
      className="select-none"
      data-view={variant}
      style={selectMode ? { touchAction: 'none' } : undefined}
      onPointerLeave={() => {
        onHover?.(null);
        setDragState(null);
      }}
      onPointerMove={
        selectMode && dragState
          ? (e) => {
              const hit = cellFromPoint(e.clientX, e.clientY);
              if (hit && hit.day === dragState.day) {
                setDragState((d) => (d ? { ...d, currentSlot: hit.slot } : null));
              }
            }
          : undefined
      }
      onPointerUp={() => {
        if (!dragState) return;
        const { day, startSlot, currentSlot } = dragState;
        onRangeSelect?.(day, Math.min(startSlot, currentSlot), Math.max(startSlot, currentSlot));
        setDragState(null);
      }}
    >
      {/* header: time-gutter corner + day columns */}
      <div className="flex">
        <div className="w-11 shrink-0" />
        <div className="grid flex-1 grid-cols-7">
          {columns.map((col) => (
            <div
              key={col.index}
              className={cn(
                'pb-1 text-center font-mono text-[10px] font-semibold',
                col.weekend ? 'text-[var(--weekend-fg)]' : 'text-muted-foreground',
              )}
            >
              {col.label}
              <span className="block text-[9px] font-medium text-muted-foreground">
                {col.dayNum}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* body: fold strips interleaved with visible row-blocks */}
      {segments.map((seg) => {
        const open = heatmapLevels
          ? true
          : !compressed || !seg.fold || manuallyExpanded.has(foldKey(seg));
        if (seg.fold && !open) {
          return (
            <FoldStrip
              key={foldKey(seg)}
              from={seg.from}
              to={seg.to}
              onExpand={() => onExpandFold(foldKey(seg))}
            />
          );
        }
        const rows = seg.to - seg.from + 1;
        return (
          <div className="flex" key={`b-${seg.from}-${seg.to}`}>
            <div className="relative w-11 shrink-0" style={{ height: rows * ROW_H }}>
              {Array.from({ length: rows }, (_, i) => seg.from + i)
                .filter((k) => k % 2 === 0)
                .map((k) => (
                  <span
                    key={k}
                    className="absolute right-1.5 -translate-y-1/2 font-mono text-[9px] text-muted-foreground"
                    style={{ top: (k - seg.from) * ROW_H }}
                  >
                    {hourLabel(k / 2)}
                  </span>
                ))}
            </div>
            <div className="grid flex-1 grid-cols-7">
              {Array.from({ length: rows }, (_, i) => seg.from + i).flatMap((k) =>
                columns.map((col) => {
                  const c = col.index;
                  const grade = grid.grade[c]?.[k] ?? 'none';
                  const gone = grid.nonexistent[c]?.[k] ?? false;
                  const highlight = highlightGrid ? (highlightGrid[c]?.[k] ?? 'n') : null;
                  const isHover = hover?.day === c && hover?.slot === k;
                  // :30 slot bottom = hour boundary (solid); :00 slot bottom = half-hour (dotted)
                  const hourBoundary = k % 2 === 1;
                  return (
                    // biome-ignore lint/a11y/noStaticElementInteractions: tap-to-open-breakdown; full keyboard grid operability is the 7d a11y pass
                    // biome-ignore lint/a11y/useKeyWithClickEvents: ARIA grid roles + roving-tabindex/arrow nav land in the 7d a11y pass
                    <div
                      key={`${c}-${k}`}
                      data-grade={grade}
                      data-nonexistent={gone || undefined}
                      data-day={c}
                      data-slot={k}
                      onPointerDown={
                        selectMode
                          ? (e) => {
                              e.preventDefault();
                              setDragState({ day: c, startSlot: k, currentSlot: k });
                            }
                          : undefined
                      }
                      onPointerEnter={
                        selectMode
                          ? () => {
                              if (dragState?.day === c)
                                setDragState((d) => (d ? { ...d, currentSlot: k } : null));
                            }
                          : onHover
                            ? () => onHover({ day: c, slot: k })
                            : undefined
                      }
                      onClick={
                        selectMode
                          ? undefined
                          : onCellTap
                            ? () => onCellTap({ day: c, slot: k })
                            : undefined
                      }
                      className={cn(
                        !selectMode &&
                          isHover &&
                          'relative z-10 ring-2 ring-inset ring-[var(--brand)]',
                        selectMode && 'cursor-crosshair',
                      )}
                      style={{
                        height: ROW_H,
                        background: heatmapLevels
                          ? highlight != null
                            ? cellBackground(grade, gone, variant, highlight)
                            : cellBackgroundHeatmap(heatmapLevels[c]?.[k] ?? 0)
                          : cellBackground(grade, gone, variant, highlight),
                        borderBottom: hourBoundary
                          ? '1px solid hsl(var(--border))'
                          : '1px dotted hsl(var(--border) / 0.75)',
                        borderRight: c < 6 ? '1px solid hsl(var(--border))' : undefined,
                        ...(effectiveRange?.day === c &&
                          k >= effectiveRange.startSlot &&
                          k <= effectiveRange.endSlot && {
                            boxShadow: 'inset 0 0 0 9999px var(--brand)',
                          }),
                      }}
                    />
                  );
                }),
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

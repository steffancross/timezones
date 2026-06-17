'use client';

// The week heatmap — the core visualization. 7 Sunday-first day columns × 48
// half-hour rows, colored by the engine's aggregate grade into continuous bands.
// Dead-hour runs render as collapsible fold strips (engine segments); the corner
// control toggles all folds. Anchored positions: every row is ROW_H tall and a
// fold collapses to a fixed strip, so live rows keep their vertical map.

import type { AggregateGrid, Grade, Segment } from '@/lib/rooms/compute';
import { cn } from '@/lib/utils';
import { FoldStrip } from './FoldStrip';
import { hourLabel, ROW_H, type WeekColumn } from './slots';

export type HoverCell = { day: number; slot: number } | null;

const SLIVER = 'repeating-linear-gradient(45deg, var(--border-strong) 0 1px, transparent 1px 4px)'; // spring-forward "clock change" marker — a thin striped cell

function cellBackground(grade: Grade, gone: boolean, weekend: boolean): string {
  if (gone) return SLIVER;
  if (grade === 'all') return 'var(--hm-all)';
  if (grade === 'some') return 'var(--hatch-soft)';
  return weekend ? 'var(--bg)' : 'transparent'; // faint weekend tint on blank cells
}

const foldKey = (s: Segment) => `${s.from}-${s.to}`;

interface Props {
  grid: AggregateGrid;
  columns: WeekColumn[];
  segments: Segment[];
  compressed: boolean;
  manuallyExpanded: Set<string>;
  onExpandFold: (key: string) => void;
  hover: HoverCell;
  onHover: (hover: HoverCell) => void;
}

export function WeekHeatmap({
  grid,
  columns,
  segments,
  compressed,
  manuallyExpanded,
  onExpandFold,
  hover,
  onHover,
}: Props) {
  return (
    <div className="select-none" onPointerLeave={() => onHover(null)}>
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
        const open = !compressed || !seg.fold || manuallyExpanded.has(foldKey(seg));
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
                  const isHover = hover?.day === c && hover?.slot === k;
                  const hourBoundary = k % 2 === 1; // bottom of a :30 row = top of the hour
                  return (
                    <div
                      key={`${c}-${k}`}
                      data-grade={grade}
                      data-nonexistent={gone || undefined}
                      data-day={c}
                      data-slot={k}
                      onPointerEnter={() => onHover({ day: c, slot: k })}
                      className={cn(
                        'border-r border-b border-[color:var(--border)]/50',
                        hourBoundary && 'border-b-[color:var(--border)]',
                        isHover && 'relative z-10 ring-2 ring-inset ring-[var(--brand)]',
                      )}
                      style={{
                        height: ROW_H,
                        background: cellBackground(grade, gone, col.weekend),
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

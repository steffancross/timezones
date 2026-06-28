'use client';

// Your paintable week. Unlike the Team heatmap (which folds toward the answer),
// the edit surface is the full 24h in a vertical scroll, opened centered on
// typical hours — everything stays reachable so you can add a slot outside your
// current range. Drag to paint: pointer-down starts a stroke, entering a cell
// while held paints it. Generic over columns/cell-state so the general and
// override modes share it.

import type { SlotState } from '@/lib/rooms/compute';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';
import { hourLabel, ROW_H } from '../team/slots';

export type EditColumn = { label: string; dayNum?: number; weekend: boolean };
export type CellInfo = { state: SlotState; ghost: boolean; changed: boolean };

/** Initial scroll so ~7am sits near the top (morning→evening in view). */
const OPEN_SLOT = 14;

function cellBackground({ state, ghost }: CellInfo): string {
  if (state === 'y') return ghost ? 'oklch(0.7 0.15 152 / 0.2)' : 'var(--paint-yes)';
  if (state === 's') return ghost ? 'oklch(0.81 0.155 92 / 0.22)' : 'var(--paint-soft)';
  return 'transparent';
}

interface Props {
  columns: EditColumn[];
  cellInfo: (col: number, slot: number) => CellInfo;
  onPaint: (col: number, slot: number) => void;
}

export function EditGrid({ columns, cellInfo, onPaint }: Props) {
  const painting = useRef(false);
  const lastCell = useRef<{ col: number; slot: number } | null>(null);
  const cols = columns.length;

  // Paint (col, slot), bridging from the previously-painted cell so a fast drag
  // doesn't skip the rows/columns it jumped over between pointer samples. We
  // interpolate along a shared axis (same column → fill the slots; same row →
  // fill the columns); diagonal jumps just paint the endpoint (rare).
  const paintTo = (col: number, slot: number) => {
    const last = lastCell.current;
    if (last && last.col === col) {
      const [a, b] = last.slot < slot ? [last.slot, slot] : [slot, last.slot];
      for (let s = a; s <= b; s++) onPaint(col, s);
    } else if (last && last.slot === slot) {
      const [a, b] = last.col < col ? [last.col, col] : [col, last.col];
      for (let c = a; c <= b; c++) onPaint(c, slot);
    } else {
      onPaint(col, slot);
    }
    lastCell.current = { col, slot };
  };

  // End the stroke wherever the pointer is released.
  useEffect(() => {
    const stop = () => {
      painting.current = false;
      lastCell.current = null;
    };
    window.addEventListener('pointerup', stop);
    return () => window.removeEventListener('pointerup', stop);
  }, []);

  const openScroll = (node: HTMLDivElement | null) => {
    if (node) node.scrollTop = OPEN_SLOT * ROW_H;
  };

  const slots = Array.from({ length: 48 }, (_, k) => k);

  return (
    <div className="select-none">
      <div className="flex">
        <div className="w-11 shrink-0" />
        <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {columns.map((col) => (
            <div
              key={col.label + (col.dayNum ?? '')}
              className={cn(
                'pb-1 text-center font-mono text-[10px] font-semibold',
                col.weekend ? 'text-[var(--weekend-fg)]' : 'text-muted-foreground',
              )}
            >
              {col.label}
              {col.dayNum !== undefined && (
                <span className="block text-[9px] font-medium text-muted-foreground">
                  {col.dayNum}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div ref={openScroll} className="max-h-[58vh] overflow-y-auto">
        <div className="flex" style={{ height: 48 * ROW_H }}>
          <div className="relative w-11 shrink-0">
            {slots
              .filter((k) => k % 2 === 0)
              .map((k) => (
                <span
                  key={k}
                  className="absolute right-1.5 -translate-y-1/2 font-mono text-[9px] text-muted-foreground"
                  style={{ top: k * ROW_H }}
                >
                  {hourLabel(k / 2)}
                </span>
              ))}
          </div>
          <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {slots.flatMap((k) =>
              columns.map((_, c) => {
                const info = cellInfo(c, k);
                return (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: its fine
                    key={`${c}-${k}`}
                    data-col={c}
                    data-slot={k}
                    data-state={info.state}
                    data-changed={info.changed || undefined}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      // Release implicit capture (touch/pen) so enter fires on other cells.
                      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      }
                      painting.current = true;
                      lastCell.current = null;
                      paintTo(c, k);
                    }}
                    onPointerEnter={() => {
                      if (painting.current) paintTo(c, k);
                    }}
                    className={cn(
                      'relative cursor-pointer border-r border-b border-[color:var(--border)]/50',
                      k % 2 === 1 && 'border-b-[color:var(--border)]',
                    )}
                    style={{ height: ROW_H, background: cellBackground(info) }}
                  >
                    {info.changed && (
                      <span className="absolute right-0.5 top-0.5 size-1 rounded-full bg-[var(--brand)]" />
                    )}
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

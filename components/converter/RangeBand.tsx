'use client';

import { useCallback } from 'react';
import { startResizeDrag } from '@/lib/converter/drag-selection';
import { useConverterStore } from '@/lib/store/converter';
import { cn } from '@/lib/utils';

interface Props {
  /** Extra classes for vertical positioning relative to the parent. */
  className?: string;
}

/**
 * Range overlay rectangle. Positioned absolutely within its parent, which
 * must define the 24-hour-column horizontal coordinate space (i.e. the band's
 * horizontal extent is computed as a percentage of the parent's content width,
 * where 100% = 24 hours). Renders nothing when no range is set.
 *
 * Mounted in two places:
 * - HourStrip (mobile only): one band per row, parent is the 24-col grid.
 * - Converter zones card (desktop only): a single band hoisted above the rows,
 *   parent is a grid cell that mirrors the row's strip column.
 *
 * The full left and right edges are the resize affordances — an 8px-wide
 * invisible strip centered on each visible bracket. No pill grip handles.
 */
export function RangeBand({ className }: Props) {
  const rangeStart = useConverterStore((s) => s.rangeStart);
  const rangeEnd = useConverterStore((s) => s.rangeEnd);
  if (rangeStart === null) return null;
  const start = rangeStart;
  const end = rangeEnd ?? rangeStart;
  const span = end - start + 1;
  const leftPercent = (start / 24) * 100;
  const widthPercent = (span / 24) * 100;
  // Interior hour notches. For a span of N tiles, paint N-1 internal dividers
  // at each inter-tile boundary. repeating-linear-gradient also paints one at
  // 100% which lands behind the right bracket — visually harmless.
  const stepPercent = 100 / span;

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute z-[2] box-border border-2 border-[color:var(--brand)]',
        className,
      )}
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
      }}
    >
      {span > 1 && (
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent calc(${stepPercent}% - 1px), color-mix(in oklab, var(--brand) 55%, transparent) calc(${stepPercent}% - 1px), color-mix(in oklab, var(--brand) 55%, transparent) ${stepPercent}%)`,
          }}
        />
      )}
      <ResizeEdge side="start" />
      <ResizeEdge side="end" />
    </div>
  );
}

/**
 * 8px-wide invisible hit area centered on a vertical bracket. Re-enables
 * pointer events (the band itself is pointer-events-none so tile hover-preview
 * underneath still fires).
 */
function ResizeEdge({ side }: { side: 'start' | 'end' }) {
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // Stop the tile's pointer-down (which would start a fresh drag and
      // discard the current range).
      e.stopPropagation();
      startResizeDrag(side);
    },
    [side],
  );
  return (
    <div
      onPointerDown={onPointerDown}
      aria-hidden="true"
      className={cn(
        'pointer-events-auto absolute inset-y-0 z-10 w-2 -translate-x-1/2 cursor-ew-resize',
        side === 'start' ? 'left-0' : 'left-full',
      )}
    />
  );
}

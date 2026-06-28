'use client';

// Day view — the zoom-in: one continuous half-hour bar per participant for a
// single day, so you can read "who specifically tapers off when." Fixed name
// column, horizontally-scrolling track (opens midday→evening), a hover alignment
// line down every row, a now-cursor when viewing today, and day paging. Compress
// trims the dead leading/trailing columns to cut horizontal scroll.

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DateTime } from '@/lib/time/luxon';
import type { SlotState } from '@/lib/rooms/compute';
import { cn } from '@/lib/utils';
import { useRoomData } from '../room-data-context';
import { Avatar } from '../Avatar';
import { hourLabel, slotLabel, type WeekColumn } from './slots';

const SEG_W = 22; // px per half-hour
const ROW_H = 30;

function segBackground(state: SlotState): string {
  if (state === 'y') return 'var(--av-yes)';
  if (state === 's') return 'var(--hatch-soft)';
  return 'transparent';
}

interface Props {
  dayIndex: number;
  columns: WeekColumn[];
  compressed: boolean;
  onPageDay: (delta: number) => void;
}

export function DayView({ dayIndex, columns, compressed, onPageDay }: Props) {
  const { projection, state, viewerTz, now, youId } = useRoomData();
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);

  const col = columns[dayIndex];
  const nameById = useMemo(
    () => new Map(state.participants.map((p) => [p.id, p.displayName])),
    [state.participants],
  );

  // Live bounds for this day (compress trims dead edges); full 24h otherwise.
  const [lo, hi] = useMemo(() => {
    if (!compressed) return [0, 47];
    let a: number | null = null;
    let b = 47;
    for (let k = 0; k < 48; k++) {
      for (const p of projection.participants) {
        if ((p.grid[dayIndex]?.[k] ?? 'n') !== 'n') {
          if (a === null) a = k;
          b = k;
          break;
        }
      }
    }
    return a === null ? [18, 40] : [a, b];
  }, [compressed, projection, dayIndex]);

  const cols = hi - lo + 1;
  const trackW = cols * SEG_W;

  // Now-cursor (only when this day is today in the viewer's zone).
  const nowLocal = DateTime.fromMillis(now).setZone(viewerTz);
  const isToday = col?.iso === nowLocal.toISODate();
  const nowLeft = isToday ? ((nowLocal.hour * 60 + nowLocal.minute) / 30 - lo) * SEG_W : null;

  // Open the scroll around midday on mount.
  const openScroll = (node: HTMLDivElement | null) => {
    if (node) node.scrollLeft = Math.max(0, (24 - lo) * SEG_W);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => onPageDay(-1)}
          disabled={dayIndex === 0}
          className="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-[var(--hover)] disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold">
          {col?.label} {col?.dayNum}
        </span>
        <button
          type="button"
          aria-label="Next day"
          onClick={() => onPageDay(1)}
          disabled={dayIndex === 6}
          className="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-[var(--hover)] disabled:opacity-40"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="flex overflow-hidden rounded-md border border-border">
        {/* fixed name column */}
        <div className="w-28 shrink-0 border-r border-border bg-[hsl(var(--card))]">
          <div className="h-6 border-b border-border" />
          {projection.participants.map((p) => (
            <div
              key={p.participantId}
              className={cn(
                'flex items-center gap-2 border-b border-[color:var(--border)]/50 px-2',
                p.participantId === youId && 'bg-[var(--brand-soft)]',
              )}
              style={{ height: ROW_H }}
            >
              <Avatar id={p.participantId} name={nameById.get(p.participantId) ?? '?'} size="sm" />
              <span className="truncate text-xs font-medium">
                {nameById.get(p.participantId) ?? '?'}
              </span>
            </div>
          ))}
        </div>

        {/* scrolling track */}
        <div className="relative flex-1 overflow-x-auto" ref={openScroll}>
          <div
            className="relative"
            style={{ width: trackW }}
            onPointerLeave={() => setHoverSlot(null)}
          >
            {/* hour axis */}
            <div className="relative h-6 border-b border-border">
              {Array.from({ length: 24 }, (_, h) => h * 2)
                .filter((k) => k >= lo && k <= hi)
                .map((k) => (
                  <span
                    key={k}
                    className="absolute top-1 font-mono text-[9px] text-muted-foreground"
                    style={{ left: (k - lo) * SEG_W }}
                  >
                    {hourLabel(k / 2)}
                  </span>
                ))}
            </div>

            {/* per-person bars */}
            {projection.participants.map((p) => (
              <div
                key={p.participantId}
                className={cn(
                  'flex border-b border-[color:var(--border)]/50',
                  p.participantId === youId && 'bg-[var(--brand-soft)]',
                )}
                style={{ height: ROW_H }}
              >
                {Array.from({ length: cols }, (_, i) => lo + i).map((k) => {
                  const st = p.grid[dayIndex]?.[k] ?? 'n';
                  return (
                    <div
                      key={k}
                      data-slot={k}
                      onPointerEnter={() => setHoverSlot(k)}
                      className={cn(
                        'shrink-0',
                        k % 2 === 0 && 'border-l border-[color:var(--border)]/40',
                      )}
                      style={{ width: SEG_W, background: segBackground(st) }}
                    />
                  );
                })}
              </div>
            ))}

            {/* hover alignment line */}
            {hoverSlot !== null && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-10 border-l border-[var(--brand)]"
                style={{ left: (hoverSlot - lo) * SEG_W }}
              >
                <span className="absolute top-0 -translate-x-1/2 rounded bg-[var(--brand)] px-1 font-mono text-[9px] text-[var(--brand-fg)]">
                  {slotLabel(hoverSlot)}
                </span>
              </div>
            )}

            {/* now cursor */}
            {nowLeft !== null && nowLeft >= 0 && nowLeft <= trackW && (
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-20 border-l-2 border-[var(--st-busy)]"
                style={{ left: nowLeft }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

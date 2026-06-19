'use client';

// Day view — the zoom-in: one continuous half-hour bar per participant for a
// single day, so you can read "who specifically tapers off when." Fixed name
// column; the full 24h is always horizontally scrollable (never clipped) — we
// just auto-calibrate the initial scroll to land on the day's available hours.
// Plus a hover alignment line, a now-cursor when viewing today, and day paging.

import type { SlotState } from '@/lib/rooms/compute';
import { DateTime } from '@/lib/time/luxon';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from '../Avatar';
import { useRoomStore } from '../room-store-context';
import { hourLabel, slotLabel, type WeekColumn } from './slots';

const SEG_W = 22; // px per half-hour
const ROW_H = 30;
const SLOTS = 48;
const TRACK_W = SLOTS * SEG_W;
const DEFAULT_SCROLL_SLOT = 16; // ~8am, when the day has no availability

function segBackground(state: SlotState): string {
  if (state === 'y') return 'var(--av-yes)';
  if (state === 's') return 'var(--paint-soft)';
  return 'transparent';
}

interface Props {
  dayIndex: number;
  columns: WeekColumn[];
  onPageDay: (delta: number) => void;
}

export function DayView({ dayIndex, columns, onPageDay }: Props) {
  const projection = useRoomStore((s) => s.projection);
  const state = useRoomStore((s) => s.state);
  const viewerTz = useRoomStore((s) => s.viewerTz);
  const now = useRoomStore((s) => s.now);
  const youId = useRoomStore((s) => s.youId);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const col = columns[dayIndex];
  const nameById = useMemo(
    () => new Map(state.participants.map((p) => [p.id, p.displayName])),
    [state.participants],
  );

  // First slot anyone is available on this day — drives where the scroll lands.
  const firstLive = useMemo(() => {
    for (let k = 0; k < SLOTS; k++) {
      for (const p of projection.participants) {
        if ((p.grid[dayIndex]?.[k] ?? 'n') !== 'n') return k;
      }
    }
    return -1;
  }, [projection, dayIndex]);

  // Re-calibrate the scroll on each day so it lands on availability (full 24h
  // stays scrollable — we only move the starting position, never clip).
  // biome-ignore lint/correctness/useExhaustiveDependencies: recalibrate per day
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const target = firstLive >= 0 ? firstLive : DEFAULT_SCROLL_SLOT;
    node.scrollLeft = Math.max(0, (target - 1) * SEG_W); // one slot of lead-in
  }, [firstLive, dayIndex]);

  // Now-cursor (only when this day is today in the viewer's zone).
  const nowLocal = DateTime.fromMillis(now).setZone(viewerTz);
  const isToday = col?.iso === nowLocal.toISODate();
  const nowLeft = isToday ? ((nowLocal.hour * 60 + nowLocal.minute) / 30) * SEG_W : null;

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

        {/* scrolling track — always the full 24h */}
        <div className="relative flex-1 overflow-x-auto" ref={scrollRef}>
          <div
            className="relative"
            style={{ width: TRACK_W }}
            onPointerLeave={() => setHoverSlot(null)}
          >
            {/* hour axis */}
            <div className="relative h-6 border-b border-border">
              {Array.from({ length: 24 }, (_, h) => h * 2).map((k) => (
                <span
                  key={k}
                  className="absolute top-1 font-mono text-[9px] text-muted-foreground"
                  style={{ left: k * SEG_W }}
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
                {Array.from({ length: SLOTS }, (_, k) => {
                  const st = p.grid[dayIndex]?.[k] ?? 'n';
                  return (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: its fine
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
                style={{ left: hoverSlot * SEG_W }}
              >
                <span className="absolute top-0 -translate-x-1/2 rounded bg-[var(--brand)] px-1 font-mono text-[9px] text-[var(--brand-fg)]">
                  {slotLabel(hoverSlot)}
                </span>
              </div>
            )}

            {/* now cursor */}
            {nowLeft !== null && (
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

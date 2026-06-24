'use client';

// Day view — the zoom-in: one continuous half-hour bar per participant for a
// single day, so you can read "who specifically tapers off when." Fixed name
// column; the full 24h is always horizontally scrollable (never clipped) — we
// just auto-calibrate the initial scroll to land on the day's available hours.
// Plus a hover alignment line, a now-cursor when viewing today, and day paging.

import type { SlotState } from '@/lib/rooms/compute';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';
import { DateTime } from '@/lib/time/luxon';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from '../Avatar';
import { useRoomStore } from '../room-store-context';
import { hourLabel, slotLabel, type WeekColumn } from './slots';

const SEG_W = 22; // px per half-hour
const ROW_H = 42;
const SLOTS = 48;
const NAME_W = 112; // w-28 = 7rem = 112px
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
  selectMode?: boolean;
  onRangeSelect?: (startSlot: number, endSlot: number) => void;
  // Committed selection — keeps the range highlighted while the export popover is open.
  highlightRange?: { startSlot: number; endSlot: number } | null;
  onHoverSlot?: (slot: number | null) => void;
}

export function DayView({
  dayIndex,
  columns,
  selectMode = false,
  onRangeSelect,
  highlightRange = null,
  onHoverSlot,
}: Props) {
  const projection = useRoomStore((s) => s.projection);
  const state = useRoomStore((s) => s.state);
  const viewerTz = useRoomStore((s) => s.viewerTz);
  const now = useRoomStore((s) => s.now);
  const youId = useRoomStore((s) => s.youId);
  const isMobile = useIsMobile();
  // Desktop hovers the alignment line; touch taps it (and it persists until the
  // next tap, since there's no pointer-leave on a finger).
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);
  const [dragSlots, setDragSlots] = useState<{ start: number; current: number } | null>(null);
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

  // Active drag takes precedence over committed selection for the overlay.
  const overlayRange = dragSlots
    ? {
        start: Math.min(dragSlots.start, dragSlots.current),
        end: Math.max(dragSlots.start, dragSlots.current),
      }
    : highlightRange
      ? { start: highlightRange.startSlot, end: highlightRange.endSlot }
      : null;

  // Now-cursor (only when this day is today in the viewer's zone).
  const nowLocal = DateTime.fromMillis(now).setZone(viewerTz);
  const isToday = col?.iso === nowLocal.toISODate();
  const nowLeft = isToday ? ((nowLocal.hour * 60 + nowLocal.minute) / 30) * SEG_W : null;

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto rounded-md border border-border [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/60 [&::-webkit-scrollbar-track]:bg-transparent"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border) / 0.6) transparent' }}
      onPointerLeave={() => {
        if (!isMobile) {
          setHoverSlot(null);
          onHoverSlot?.(null);
        }
        setDragSlots(null);
      }}
      onPointerUp={() => {
        if (!dragSlots) return;
        onRangeSelect?.(
          Math.min(dragSlots.start, dragSlots.current),
          Math.max(dragSlots.start, dragSlots.current),
        );
        setDragSlots(null);
      }}
    >
      <div className="relative" style={{ width: NAME_W + TRACK_W }}>
        {/* Axis header — sticky name corner + hour labels */}
        <div className="flex h-6 border-b border-border">
          <div className="sticky left-0 z-10 w-28 shrink-0 border-r border-border bg-[hsl(var(--card))]" />
          <div className="relative" style={{ width: TRACK_W }}>
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
        </div>

        {/* Per-person rows — name cell sticky, slot track scrolls */}
        {projection.participants.map((p) => {
          const isYou = p.participantId === youId;
          return (
            <div
              key={p.participantId}
              className="flex"
              style={{ height: ROW_H, borderBottom: '1px solid hsl(var(--border))' }}
            >
              <div className="sticky left-0 z-10 flex w-28 shrink-0 items-center gap-2 border-r border-border bg-[hsl(var(--card))] px-2">
                <Avatar
                  id={p.participantId}
                  name={nameById.get(p.participantId) ?? '?'}
                  size="sm"
                />
                <span className="truncate text-xs font-medium">
                  {nameById.get(p.participantId) ?? '?'}
                </span>
              </div>
              <div
                className="flex"
                style={{
                  width: TRACK_W,
                  background: isYou ? 'var(--brand-soft)' : undefined,
                  touchAction: selectMode ? 'none' : undefined,
                }}
              >
                {Array.from({ length: SLOTS }, (_, k) => {
                  const st = p.grid[dayIndex]?.[k] ?? 'n';
                  return (
                    // biome-ignore lint/a11y/noStaticElementInteractions: tap-to-set the alignment line; full keyboard operability is the 7d a11y pass
                    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard alignment-line control lands in the 7d a11y pass
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: its fine
                      key={k}
                      data-slot={k}
                      onPointerDown={
                        selectMode
                          ? (e) => {
                              e.preventDefault();
                              setDragSlots({ start: k, current: k });
                            }
                          : undefined
                      }
                      onPointerEnter={
                        selectMode
                          ? () => {
                              if (dragSlots) setDragSlots((d) => (d ? { ...d, current: k } : null));
                            }
                          : isMobile
                            ? undefined
                            : () => {
                                setHoverSlot(k);
                                onHoverSlot?.(k);
                              }
                      }
                      onClick={
                        selectMode
                          ? undefined
                          : () => {
                              setHoverSlot(k);
                              onHoverSlot?.(k);
                            }
                      }
                      className={cn('shrink-0', selectMode && 'cursor-crosshair')}
                      style={{
                        width: SEG_W,
                        background: segBackground(st),
                        borderLeft:
                          k === 0
                            ? undefined
                            : k % 2 === 0
                              ? '1px solid hsl(var(--border))'
                              : '1px dotted hsl(var(--border) / 0.75)',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Hover alignment line — offset past the sticky name column */}
        {hoverSlot !== null && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-10 border-l border-[var(--brand)]"
            style={{ left: NAME_W + hoverSlot * SEG_W }}
          >
            <span className="absolute top-0 -translate-x-1/2 rounded bg-[var(--brand)] px-1 font-mono text-[9px] text-[var(--brand-fg)]">
              {slotLabel(hoverSlot)}
            </span>
          </div>
        )}

        {/* Now cursor */}
        {nowLeft !== null && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-20 border-l-2 border-[var(--st-busy)]"
            style={{ left: NAME_W + nowLeft }}
          />
        )}

        {/* Selection overlay — active drag takes precedence over committed selection */}
        {overlayRange && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-30"
            style={{
              left: NAME_W + overlayRange.start * SEG_W,
              width: (overlayRange.end - overlayRange.start + 1) * SEG_W,
              background: 'var(--brand)',
            }}
          >
            <span className="absolute top-0 left-0 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--brand-fg)] px-1 font-mono text-[9px] text-[var(--brand)]">
              {slotLabel(overlayRange.start)}
            </span>
            <span className="absolute top-0 right-0 translate-x-1/2 whitespace-nowrap rounded bg-[var(--brand-fg)] px-1 font-mono text-[9px] text-[var(--brand)]">
              {slotLabel(overlayRange.end + 1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

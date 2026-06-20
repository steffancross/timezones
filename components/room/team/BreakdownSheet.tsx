'use client';

// Mobile per-person breakdown — the touch equivalent of the desktop sidebar's
// hover readout. Tapping a heatmap cell opens this drawer showing the
// "X free · Y if needed" split (spec 7a's carried fix — NOT a bare "5 of 5")
// plus each person's state. Reads the same already-memoized projection the
// sidebar uses, so no re-projection.

import { useEffect, useMemo, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import type { SlotState } from '@/lib/rooms/compute';
import { cn } from '@/lib/utils';
import { Avatar } from '../Avatar';
import { useRoomStore } from '../room-store-context';
import { slotLabel, type WeekColumn } from './slots';
import type { HoverCell } from './WeekHeatmap';

interface Props {
  cell: HoverCell; // { day, slot } | null — open when non-null
  columns: WeekColumn[];
  onClose: () => void;
}

export function BreakdownSheet({ cell, columns, onClose }: Props) {
  const state = useRoomStore((s) => s.state);
  const projection = useRoomStore((s) => s.projection);
  const youId = useRoomStore((s) => s.youId);
  const members = state.participants;

  // Retain the last cell so the drawer keeps its content through the close
  // animation (cell goes null the moment we start closing).
  const [shown, setShown] = useState<HoverCell>(null);
  useEffect(() => {
    if (cell) setShown(cell);
  }, [cell]);

  // Per-person state at the cell, from the projection (compute set only).
  const states = useMemo(() => {
    if (!shown) return null;
    const map = new Map<string, SlotState>();
    for (const p of projection.participants) {
      map.set(p.participantId, p.grid[shown.day]?.[shown.slot] ?? 'n');
    }
    return map;
  }, [shown, projection]);

  let freeCount = 0;
  let softCount = 0;
  if (states) {
    for (const s of states.values()) {
      if (s === 'y') freeCount++;
      else if (s === 's') softCount++;
    }
  }

  return (
    <Drawer
      open={cell !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent>
        {shown && (
          <>
            <DrawerHeader>
              <DrawerTitle>
                {columns[shown.day]?.label} · {slotLabel(shown.slot)}
              </DrawerTitle>
              <div className="font-medium text-[var(--av-yes-ink)]">
                {freeCount} free{softCount ? ` · ${softCount} if needed` : ''}
              </div>
            </DrawerHeader>
            <div className="flex flex-col gap-1 px-4 pb-6">
              {members.map((m) => {
                const st = states?.get(m.id);
                return (
                  <div
                    key={m.id}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-1 py-1',
                      m.id === youId && 'bg-[var(--brand-soft)]',
                    )}
                  >
                    <Avatar id={m.id} name={m.displayName} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm">{m.displayName}</span>
                    {!m.hasResponded ? (
                      <span className="rounded bg-[var(--hover)] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        hasn't filled
                      </span>
                    ) : (
                      <span
                        className="inline-block size-3.5 rounded-[3px] border border-border"
                        style={{
                          background:
                            st === 'y'
                              ? 'var(--hm-all)'
                              : st === 's'
                                ? 'var(--paint-soft)'
                                : 'transparent',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

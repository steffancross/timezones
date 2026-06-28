'use client';

// The compute/roster rail — double duty. At rest: the roster with select/deselect
// (deselect recomputes the aggregate, non-destructively) and a "Counting N of M"
// header; unresponded people are tagged and uncounted. On hover: it flips to the
// hovered cell's per-person breakdown with the "X free · Y if needed" split,
// derived from the already-memoized projection (no re-projection).

import { Check } from 'lucide-react';
import { useMemo } from 'react';
import type { SlotState } from '@/lib/rooms/compute';
import { cn } from '@/lib/utils';
import { useRoomStore } from '../room-store-context';
import { Avatar } from '../Avatar';
import type { HoverCell } from './WeekHeatmap';
import { slotLabel, type WeekColumn } from './slots';

interface Props {
  hover: HoverCell;
  columns: WeekColumn[];
}

export function RosterSidebar({ hover, columns }: Props) {
  const state = useRoomStore((s) => s.state);
  const selected = useRoomStore((s) => s.selected);
  const toggleSelected = useRoomStore((s) => s.toggleSelected);
  const projection = useRoomStore((s) => s.projection);
  const youId = useRoomStore((s) => s.youId);
  const members = state.participants;

  // Per-person state at the hovered cell, from the projection (compute set only).
  const hoverStates = useMemo(() => {
    if (!hover) return null;
    const map = new Map<string, SlotState>();
    for (const p of projection.participants) {
      map.set(p.participantId, p.grid[hover.day]?.[hover.slot] ?? 'n');
    }
    return map;
  }, [hover, projection]);

  const countedTotal = members.filter((m) => m.hasResponded && selected.has(m.id)).length;
  const anyUnresponded = members.some((m) => !m.hasResponded);

  let freeCount = 0;
  let softCount = 0;
  if (hoverStates) {
    for (const s of hoverStates.values()) {
      if (s === 'y') freeCount++;
      else if (s === 's') softCount++;
    }
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-1 border-l border-border p-3 text-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-medium">{hover ? 'At this time' : 'Counting'}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {countedTotal} of {members.length}
        </span>
      </div>

      {hover && (
        <div className="mb-1 flex flex-col gap-0.5 rounded-md bg-[var(--bg)] px-2 py-1.5">
          <span className="text-xs text-muted-foreground">
            {columns[hover.day]?.label} · {slotLabel(hover.slot)}
          </span>
          <span className="font-medium text-[var(--av-yes-ink)]">
            {freeCount} free{softCount ? ` · ${softCount} if needed` : ''}
          </span>
        </div>
      )}

      {members.map((m) => {
        const unresponded = !m.hasResponded;
        const on = selected.has(m.id) && !unresponded;
        const st = hoverStates?.get(m.id);
        return (
          <div
            key={m.id}
            className={cn(
              'flex items-center gap-2 rounded-md px-1 py-1',
              !on && 'opacity-55',
              m.id === youId && 'bg-[var(--brand-soft)]',
            )}
          >
            <Avatar id={m.id} name={m.displayName} size="sm" />
            <span className="min-w-0 flex-1 truncate">{m.displayName}</span>

            {unresponded ? (
              <span className="rounded bg-[var(--hover)] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                hasn't filled
              </span>
            ) : hover ? (
              <span
                className="inline-block size-3.5 rounded-[3px] border border-border"
                style={{
                  background:
                    st === 'y' ? 'var(--hm-all)' : st === 's' ? 'var(--paint-soft)' : 'transparent',
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => toggleSelected(m.id)}
                aria-pressed={on}
                aria-label={`${on ? 'Remove' : 'Add'} ${m.displayName}`}
                className={cn(
                  'inline-flex size-4 items-center justify-center rounded border',
                  on
                    ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-fg)]'
                    : 'border-border',
                )}
              >
                {on && <Check className="size-3" />}
              </button>
            )}
          </div>
        );
      })}

      <p className="mt-2 text-xs text-muted-foreground">
        {hover
          ? "Hovering a time shows each person's answer."
          : anyUnresponded
            ? "People who haven't painted their week yet are ignored until they do."
            : "Uncheck anyone who's out — the grid recomputes without them."}
      </p>
    </aside>
  );
}

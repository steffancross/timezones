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
  onMemberHover?: (id: string | null) => void;
  hoveredMemberId?: string | null;
}

export function RosterSidebar({ hover, columns, onMemberHover, hoveredMemberId }: Props) {
  const state = useRoomStore((s) => s.state);
  const selected = useRoomStore((s) => s.selected);
  const toggleSelected = useRoomStore((s) => s.toggleSelected);
  const projection = useRoomStore((s) => s.projection);
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

  const respondedSelected = members.filter((m) => m.hasResponded && selected.has(m.id));
  const freeCount = hoverStates
    ? respondedSelected.filter((m) => hoverStates.get(m.id) === 'y').length
    : 0;
  const softCount = hoverStates
    ? respondedSelected.filter((m) => hoverStates.get(m.id) === 's').length
    : 0;

  const countedTotal = respondedSelected.length;
  const anyUnresponded = members.some((m) => !m.hasResponded);

  const hoverPillLabel = hover ? `${columns[hover.day]?.label} · ${slotLabel(hover.slot)}` : ' ';
  const hoverCountLabel = hover
    ? `${freeCount} free${softCount > 0 ? ` · ${softCount} if needed` : ''}`
    : ' ';

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-1 border-l border-border p-3 text-sm">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[13px] font-semibold tracking-tight">
          {hover ? 'At this time' : 'Counting'}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {countedTotal} of {members.length}
        </span>
      </div>

      <div
        className={cn(
          'rounded-[5px] border border-[color:var(--brand)]/25 bg-[var(--brand-soft)] px-2.5 py-1.5 font-mono text-[10.5px] font-semibold text-[var(--brand)]',
          !hover && 'invisible',
        )}
      >
        {hoverPillLabel}
      </div>
      <div
        className={cn('mb-1 font-mono text-[9.5px] text-muted-foreground', !hover && 'invisible')}
      >
        {hoverCountLabel}
      </div>

      {members.map((m) => {
        const unresponded = !m.hasResponded;
        const on = selected.has(m.id) && !unresponded;
        const st = hoverStates?.get(m.id);
        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: mouse-only hover highlight; no keyboard interaction needed
          <div
            key={m.id}
            className={cn(
              'flex items-center gap-2 rounded-md px-1 py-1',
              !on && 'opacity-55',
              m.id === hoveredMemberId && 'bg-[var(--brand-soft)]',
            )}
            onMouseEnter={() => onMemberHover?.(m.id)}
            onMouseLeave={() => onMemberHover?.(null)}
          >
            <Avatar id={m.id} name={m.displayName} size="sm" />
            <span className="min-w-0 flex-1 truncate">{m.displayName}</span>

            {unresponded ? (
              <span className="rounded bg-[var(--hover)] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                hasn&apos;t filled
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
        Uncheck anyone who&apos;s out — the grid recomputes without them. Hover the grid to see each
        person&apos;s answer; hover a person to highlight their week.
        {anyUnresponded && " People who haven't painted yet are ignored until they do."}
      </p>
    </aside>
  );
}

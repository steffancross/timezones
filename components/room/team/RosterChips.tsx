'use client';

// Mobile roster — the desktop sidebar's select/deselect as a horizontal chip row
// (the sidebar can't sit beside the grid on a phone). Same store wiring as
// RosterSidebar: tapping a chip toggles a responder in/out of the aggregate, and
// the grid recomputes without them. Unresponded people are tagged and uncounted.

import { cn } from '@/lib/utils';
import { Avatar } from '../Avatar';
import { useRoomStore } from '../room-store-context';

export function RosterChips() {
  const state = useRoomStore((s) => s.state);
  const selected = useRoomStore((s) => s.selected);
  const toggleSelected = useRoomStore((s) => s.toggleSelected);
  const members = state.participants;

  const countedTotal = members.filter((m) => m.hasResponded && selected.has(m.id)).length;

  return (
    <div className="mt-3">
      <div className="mb-1.5 font-mono text-xs text-muted-foreground">
        Counting {countedTotal} of {members.length}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {members.map((m) => {
          const unresponded = !m.hasResponded;
          const on = selected.has(m.id) && !unresponded;
          return (
            <button
              key={m.id}
              type="button"
              disabled={unresponded}
              onClick={() => toggleSelected(m.id)}
              aria-pressed={on}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs',
                on ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-border',
                unresponded && 'opacity-55',
              )}
            >
              <Avatar id={m.id} name={m.displayName} size="sm" />
              <span className="max-w-28 truncate">{m.displayName}</span>
              {unresponded && (
                <span className="font-mono text-[10px] text-muted-foreground">hasn't filled</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

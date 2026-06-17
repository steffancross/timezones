// A collapsed dead-hour band. Clicking it expands just this fold (and the expand
// persists across recomputes for the session — see TeamTab's manuallyExpanded).

import { ChevronDown } from 'lucide-react';
import { slotLabel } from './slots';

interface Props {
  from: number; // first slot, inclusive
  to: number; // last slot, inclusive
  onExpand: () => void;
}

export function FoldStrip({ from, to, onExpand }: Props) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="flex w-full items-center gap-2 border-b border-border bg-[var(--bg)] px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-[var(--hover)]"
    >
      <span className="font-medium text-foreground/70">
        {slotLabel(from)} – {slotLabel((to + 1) % 48)}
      </span>
      <span>· nobody around</span>
      <span className="ml-auto inline-flex items-center gap-1">
        expand <ChevronDown className="size-3" />
      </span>
    </button>
  );
}

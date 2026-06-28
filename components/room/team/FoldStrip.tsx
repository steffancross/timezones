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
      className="mt-[3px] mb-[6px] flex h-[23px] w-full items-center gap-2 rounded-[5px] border border-dashed border-border pl-11 pr-3 text-left font-mono text-[10px] text-muted-foreground hover:border-muted-foreground/40"
      style={{
        background:
          'repeating-linear-gradient(135deg, hsl(var(--muted)) 0 6px, var(--bg) 6px 12px)',
      }}
    >
      <span className="font-semibold text-foreground/70">
        {slotLabel(from)} – {slotLabel((to + 1) % 48)}
      </span>
      <span>· nobody around</span>
      <span className="ml-auto inline-flex items-center gap-1">
        expand <ChevronDown className="size-3" />
      </span>
    </button>
  );
}

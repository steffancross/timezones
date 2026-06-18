'use client';

// The paint palette — pick what a stroke writes. Available / If needed / Erase.

import type { SlotState } from '@/lib/rooms/compute';
import { cn } from '@/lib/utils';

const SWATCHES: { state: SlotState; label: string; bg: string }[] = [
  { state: 'y', label: 'Available', bg: 'var(--paint-yes)' },
  { state: 's', label: 'If needed', bg: 'var(--paint-soft)' },
  { state: 'n', label: 'Erase', bg: 'transparent' },
];

interface Props {
  active: SlotState;
  onChange: (state: SlotState) => void;
}

export function PaintPalette({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      {SWATCHES.map((s) => (
        <button
          key={s.state}
          type="button"
          onClick={() => onChange(s.state)}
          aria-pressed={active === s.state}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs',
            active === s.state
              ? 'border-[var(--brand)] bg-[var(--brand-soft)]'
              : 'border-border hover:bg-[var(--hover)]',
          )}
        >
          <span
            className="inline-block size-3 rounded-[3px] border border-border"
            style={{ background: s.bg }}
          />
          {s.label}
        </button>
      ))}
    </div>
  );
}

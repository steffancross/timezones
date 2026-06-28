'use client';

import { REGIONS, type Region } from '@/lib/conversions/regions';
import { cn } from '@/lib/utils';

export type RegionFilter = 'All' | Region;

const OPTIONS: RegionFilter[] = ['All', ...REGIONS];

interface Props {
  value: RegionFilter;
  onChange: (next: RegionFilter) => void;
}

export function RegionPills({ value, onChange }: Props) {
  return (
    <fieldset className="flex flex-wrap items-center gap-1 rounded-full border border-border bg-card p-1">
      <legend className="sr-only">Filter by region</legend>
      {OPTIONS.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt)}
            className={cn(
              'rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors',
              active
                ? 'bg-[var(--fg)] text-[var(--bg)]'
                : 'text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]',
            )}
          >
            {opt}
          </button>
        );
      })}
    </fieldset>
  );
}

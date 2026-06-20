'use client';

// Room tab nav (Overview · Team · Availability). Team is the spec-4 deliverable;
// Overview (spec 6) and Availability (spec 5) are present as real chrome but land
// their content in later specs.

import { Clock, LayoutGrid, Paintbrush } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RoomTab = 'overview' | 'team' | 'availability';

const TABS: { id: RoomTab; label: string; Icon: typeof Clock }[] = [
  { id: 'overview', label: 'Overview', Icon: Clock },
  { id: 'team', label: 'Team', Icon: LayoutGrid },
  { id: 'availability', label: 'Availability', Icon: Paintbrush },
];

interface Props {
  active: RoomTab;
  onChange: (tab: RoomTab) => void;
}

export function RoomTabs({ active, onChange }: Props) {
  return (
    <div className="hidden items-center gap-1 border-b border-border px-4 md:flex">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-current={active === id ? 'page' : undefined}
          className={cn(
            'inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
            active === id
              ? 'border-[var(--brand)] text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

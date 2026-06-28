'use client';

// Mobile bottom-tab nav (Overview · Team · You). Phone-only — the desktop top
// tabs (RoomTabs) hide at md. Driven by the same `tab` state RoomShell owns, so
// it and the top tabs stay in sync. "You" is the Availability tab (per the mock).

import { Clock, LayoutGrid, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoomTab } from './RoomTabs';

const ITEMS: { id: RoomTab; label: string; Icon: typeof Clock }[] = [
  { id: 'overview', label: 'Overview', Icon: Clock },
  { id: 'team', label: 'Team', Icon: LayoutGrid },
  { id: 'availability', label: 'You', Icon: User },
];

interface Props {
  active: RoomTab;
  onChange: (tab: RoomTab) => void;
}

export function RoomBottomNav({ active, onChange }: Props) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-[hsl(var(--card))] md:hidden">
      {ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-current={active === id ? 'page' : undefined}
          className={cn(
            'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
            active === id ? 'text-[var(--brand)]' : 'text-muted-foreground',
          )}
        >
          <Icon className="size-5" />
          {label}
        </button>
      ))}
    </nav>
  );
}

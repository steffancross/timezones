'use client';

// The room frame: identity bar + tab nav + the active tab's panel. Team is built
// in spec 4; Overview (spec 6) and Availability (spec 5) are placeholders so the
// nav is real while their content lands later.

import env from '@/lib/env';
import { ThemeToggle } from '@/components/site/ThemeToggle';
import Link from 'next/link';
import { useState } from 'react';
import { AvailabilityTab } from './availability/AvailabilityTab';
import { OverviewTab } from './overview/OverviewTab';
import { RoomBottomNav } from './RoomBottomNav';
import { TeamTab } from './team/TeamTab';
import { RoomTabs, type RoomTab } from './RoomTabs';
import { RoomTop } from './RoomTop';

export function RoomShell() {
  const [tab, setTab] = useState<RoomTab>('overview');

  return (
    <div className="mx-auto flex max-w-5xl flex-col">
      {/* Slim site nav — just wordmark + theme toggle */}
      <div className="flex h-12 items-center justify-between px-1 md:px-4">
        <Link
          prefetch={false}
          href="/"
          className="text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          {env.NEXT_PUBLIC_SITE_NAME}
        </Link>
        <ThemeToggle />
      </div>

      {/* Full-bleed on a phone; a framed card on desktop. */}
      <div className="flex flex-1 flex-col border-border bg-[hsl(var(--card))] md:mx-0 md:rounded-[var(--radius-lg)] md:border">
        <RoomTop />
        <RoomTabs active={tab} onChange={setTab} />
        {/* pad past the fixed bottom nav on mobile */}
        <div className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          {tab === 'team' && <TeamTab onAddAvailability={() => setTab('availability')} />}
          {tab === 'overview' && <OverviewTab onAddAvailability={() => setTab('availability')} />}
          {tab === 'availability' && <AvailabilityTab />}
        </div>
      </div>
      <RoomBottomNav active={tab} onChange={setTab} />
    </div>
  );
}

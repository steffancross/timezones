'use client';

// The room frame: identity bar + tab nav + the active tab's panel. Team is built
// in spec 4; Overview (spec 6) and Availability (spec 5) are placeholders so the
// nav is real while their content lands later.

import { useState } from 'react';
import { AvailabilityTab } from './availability/AvailabilityTab';
import { OverviewTab } from './overview/OverviewTab';
import { TeamTab } from './team/TeamTab';
import { RoomTabs, type RoomTab } from './RoomTabs';
import { RoomTop } from './RoomTop';

export function RoomShell() {
  const [tab, setTab] = useState<RoomTab>('overview');

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col">
      <div className="m-3 flex flex-1 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-[hsl(var(--card))]">
        <RoomTop />
        <RoomTabs active={tab} onChange={setTab} />
        <div className="flex-1">
          {tab === 'team' && <TeamTab onAddAvailability={() => setTab('availability')} />}
          {tab === 'overview' && <OverviewTab onAddAvailability={() => setTab('availability')} />}
          {tab === 'availability' && <AvailabilityTab />}
        </div>
      </div>
    </div>
  );
}

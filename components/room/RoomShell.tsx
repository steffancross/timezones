'use client';

// The room frame: identity bar + tab nav + the active tab's panel. Team is built
// in spec 4; Overview (spec 6) and Availability (spec 5) are placeholders so the
// nav is real while their content lands later.

import { useState } from 'react';
import { AvailabilityTab } from './availability/AvailabilityTab';
import { TeamTab } from './team/TeamTab';
import { RoomTabs, type RoomTab } from './RoomTabs';
import { RoomTop } from './RoomTop';

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex min-h-60 items-center justify-center p-10 text-center text-sm text-muted-foreground">
      {label} arrives in a later step.
    </div>
  );
}

export function RoomShell() {
  const [tab, setTab] = useState<RoomTab>('team');

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col">
      <div className="m-3 flex flex-1 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-[hsl(var(--card))]">
        <RoomTop />
        <RoomTabs active={tab} onChange={setTab} />
        <div className="flex-1">
          {tab === 'team' && <TeamTab />}
          {tab === 'overview' && <Placeholder label="The Overview" />}
          {tab === 'availability' && <AvailabilityTab />}
        </div>
      </div>
    </div>
  );
}

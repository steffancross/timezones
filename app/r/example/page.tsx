// Example room: static demo using EXAMPLE_ROOM fixture data.
// No DB calls — state is hardcoded. `demo={true}` tells the store to skip all
// API writes so painting updates the heatmap in memory but nothing persists.
// force-dynamic only to read cf-timezone for the viewer's local timezone.

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { RoomDataProvider } from '@/components/room/RoomDataProvider';
import { RoomShell } from '@/components/room/RoomShell';
import { emptyWeek } from '@/lib/rooms/blob';
import type { PublicParticipant, RoomState } from '@/lib/rooms/db';
import { EXAMPLE_ROOM } from '@/lib/rooms/example-fixture';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Example Room',
  robots: { index: false, follow: false },
};

const DEMO_YOU_ID = 'demo-you';

export default async function ExampleRoomPage() {
  const h = await headers();
  const viewerTz = h.get('cf-timezone') ?? 'America/New_York';

  const demoYou: PublicParticipant = {
    id: DEMO_YOU_ID,
    displayName: 'You',
    timezone: viewerTz,
    generalWeek: emptyWeek(),
    overrides: {},
    hasResponded: false,
    hasPassword: false,
  };

  const demoRoom: RoomState = {
    ...EXAMPLE_ROOM,
    participants: [...EXAMPLE_ROOM.participants, demoYou],
  };

  return (
    <RoomDataProvider
      state={demoRoom}
      youId={DEMO_YOU_ID}
      viewerTz={viewerTz}
      demo={true}
    >
      <RoomShell />
    </RoomDataProvider>
  );
}

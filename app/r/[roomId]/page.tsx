// The Availability Room page (spec 4). Per-visitor and uncached (force-dynamic):
// it resolves "you" from the path-scoped cookie and reads the viewer's zone from
// Cloudflare headers, so it must never be served from the incremental cache.
// SSRs the initial RoomState + identity and hands them to the client provider.

import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { RoomDataProvider } from '@/components/room/RoomDataProvider';
import { RoomShell } from '@/components/room/RoomShell';
import { readSecretCookie } from '@/lib/rooms/cookies';
import { readRoomState } from '@/lib/rooms/db';
import { resolveMe } from '@/lib/rooms/identity';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roomId: string }>;
}): Promise<Metadata> {
  const { roomId } = await params;
  const state = await readRoomState(getCloudflareContext().env.DB, roomId);
  const name = state?.room.name?.trim();
  // Rooms are private/unguessable — keep them out of search results.
  return { title: name || 'Availability Room', robots: { index: false, follow: false } };
}

export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const [{ roomId }, h] = await Promise.all([params, headers()]);
  const db = getCloudflareContext().env.DB;

  const state = await readRoomState(db, roomId);
  if (!state) notFound();

  const me = await resolveMe(db, roomId, readSecretCookie(h.get('cookie')));
  const youId = me?.participantId ?? null;

  // Viewer zone: your own participant's zone if you're in the room, else the
  // Cloudflare-detected zone for a lurker, else a safe default.
  const youTz = youId ? state.participants.find((p) => p.id === youId)?.timezone : undefined;
  const viewerTz = youTz ?? h.get('cf-timezone') ?? 'UTC';

  return (
    <RoomDataProvider state={state} youId={youId} viewerTz={viewerTz}>
      <RoomShell />
    </RoomDataProvider>
  );
}

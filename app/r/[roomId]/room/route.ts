// PATCH /r/:roomId/room — renameRoom. Flat ownership: any participant of the
// room may rename it. A room-level write, so it bumps last_active_at. (This lives
// at /room, not the bare /r/:roomId, because that segment is reserved for the
// future HTML room page — App Router can't host a page and a route handler on the
// same segment.)

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { readSecretCookie } from '@/lib/rooms/cookies';
import { mapWriteError, readJsonBody, requireJsonContentType } from '@/lib/rooms/handler-utils';
import { renameRoom, resolveMe } from '@/lib/rooms/identity';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
): Promise<Response> {
  const guard = requireJsonContentType(request);
  if (guard) return guard;

  const { roomId } = await params;
  const { env } = getCloudflareContext();
  const db = env.DB;

  // Only a participant may rename (flat ownership, but not a drive-by lurker).
  const me = await resolveMe(db, roomId, readSecretCookie(request.headers.get('cookie')));
  if (!me) return Response.json({ error: 'not a participant' }, { status: 401 });

  const body = await readJsonBody(request);
  try {
    const room = await renameRoom(db, roomId, body.name);
    return Response.json({ room });
  } catch (err) {
    return mapWriteError(err);
  }
}

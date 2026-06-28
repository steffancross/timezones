// POST /api/rooms — createRoom. The one public, non-room-scoped write: mints a
// fresh room and returns its id so the client can navigate to /r/{id}. A thin
// wrapper over the pure `createRoom` op (high-entropy id + collision retry live
// there). v1 creates an unnamed room — rename happens later via settings.

import { requireJsonContentType, readJsonBody } from '@/lib/rooms/handler-utils';
import { getDb } from '@/lib/rooms/context';
import { createRoom } from '@/lib/rooms/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const guard = requireJsonContentType(request);
  if (guard) return guard;

  // TODO(spec 7c): per-IP room-creation rate-limit (ROOM_CREATE_LIMITER binding
  // + clientIp), mirroring the CLAIM_LIMITER pattern in /r/:roomId/claim. This
  // is the one public write nothing else rate-limits.

  const body = await readJsonBody(request);
  const name = typeof body.name === 'string' ? body.name : null;

  const { id } = await createRoom(getDb(), name);
  return Response.json({ id });
}

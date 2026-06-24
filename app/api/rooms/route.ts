// POST /api/rooms — createRoom. The one public, non-room-scoped write: mints a
// fresh room and returns its id so the client can navigate to /r/{id}. A thin
// wrapper over the pure `createRoom` op (high-entropy id + collision retry live
// there). v1 creates an unnamed room — rename happens later via settings.

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createRoomLimited } from '@/lib/rooms/db';
import { clientIp, readJsonBody, requireJsonContentType } from '@/lib/rooms/handler-utils';
import {
  allowAllRateLimiter,
  cloudflareRateLimiter,
  roomCreateRateLimitKey,
} from '@/lib/rooms/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const guard = requireJsonContentType(request);
  if (guard) return guard;

  const { env } = getCloudflareContext();

  // Per-IP rate-limit — the one public write nothing else guards (spec 7c). The
  // native binding isn't modeled locally / in tests, so fall back to allow-all.
  const limiter = env.ROOM_CREATE_LIMITER
    ? cloudflareRateLimiter(env.ROOM_CREATE_LIMITER)
    : allowAllRateLimiter;

  const body = await readJsonBody(request);
  const name = typeof body.name === 'string' ? body.name : null;

  const result = await createRoomLimited(
    env.DB,
    limiter,
    roomCreateRateLimitKey(clientIp(request)),
    name,
  );
  if ('error' in result) return Response.json({ error: result.error }, { status: 429 });

  return Response.json({ id: result.id });
}

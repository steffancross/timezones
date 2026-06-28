// PATCH /r/:roomId/me — updateIdentity on the resolved participant (name /
// timezone / password). `password: null` clears it. Must be "you": resolves the
// cookie first and 401s a lurker. Does not bump the room's last_active_at.

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { readSecretCookie } from '@/lib/rooms/cookies';
import { mapWriteError, readJsonBody, requireJsonContentType } from '@/lib/rooms/handler-utils';
import { resolveMe, updateIdentity } from '@/lib/rooms/identity';

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

  const me = await resolveMe(db, roomId, readSecretCookie(request.headers.get('cookie')));
  if (!me) return Response.json({ error: 'not a participant' }, { status: 401 });

  const body = await readJsonBody(request);
  try {
    const participant = await updateIdentity(db, roomId, me.participantId, {
      name: body.name,
      timezone: body.timezone,
      password: body.password,
    });
    return Response.json({ participant });
  } catch (err) {
    return mapWriteError(err);
  }
}

// PATCH /r/:roomId/me/availability — write your own availability (spec 5, the
// first write path). Authenticated via the cookie: resolveMe → you; a lurker is
// rejected. The payload carries no participant id, so you can only write your own
// blob. Validation + the actual write live in the pure writeAvailability op.

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { writeAvailability } from '@/lib/rooms/availability';
import { readSecretCookie } from '@/lib/rooms/cookies';
import { mapWriteError, readJsonBody, requireJsonContentType } from '@/lib/rooms/handler-utils';
import { resolveMe } from '@/lib/rooms/identity';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
): Promise<Response> {
  const guard = requireJsonContentType(request);
  if (guard) return guard;

  const { roomId } = await params;
  const db = getCloudflareContext().env.DB;

  const me = await resolveMe(db, roomId, readSecretCookie(request.headers.get('cookie')));
  if (!me) return Response.json({ error: 'not a participant' }, { status: 401 });

  const body = await readJsonBody(request);
  try {
    const participant = await writeAvailability(db, roomId, me.participantId, {
      generalWeek: typeof body.generalWeek === 'string' ? body.generalWeek : undefined,
      overrides: body.overrides as { set?: Record<string, string>; clear?: string[] } | undefined,
    });
    return Response.json({ participant });
  } catch (err) {
    return mapWriteError(err);
  }
}

// POST /r/:roomId/participants — createParticipant. Turns the cookie-bearing
// lurker into a named participant (availability left NULL for spec 5). Mints a
// cookie secret if absent, binds its hash to the new row, enforces the cap.
// Returns the public participant + youId.

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { buildSecretCookie, readSecretCookie } from '@/lib/rooms/cookies';
import { generateSecret } from '@/lib/rooms/crypto';
import {
  isSecureRequest,
  mapWriteError,
  readJsonBody,
  requireJsonContentType,
} from '@/lib/rooms/handler-utils';
import { createParticipant } from '@/lib/rooms/identity';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
): Promise<Response> {
  const guard = requireJsonContentType(request);
  if (guard) return guard;

  const { roomId } = await params;
  const { env } = getCloudflareContext();
  const body = await readJsonBody(request);

  // Same device keeps its secret; a brand-new visitor gets a fresh one set now.
  const existing = readSecretCookie(request.headers.get('cookie'));
  const secret = existing ?? generateSecret();

  try {
    const { participant, youId } = await createParticipant(
      env.DB,
      roomId,
      { name: body.name, timezone: body.timezone, password: body.password },
      secret,
    );
    return Response.json(
      { participant, you: { participantId: youId } },
      {
        headers: {
          'Set-Cookie': buildSecretCookie(roomId, secret, { secure: isSecureRequest(request) }),
        },
      },
    );
  } catch (err) {
    return mapWriteError(err);
  }
}

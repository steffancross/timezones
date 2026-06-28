// POST /r/:roomId/claim — re-claim an existing participant on a new device.
// Rate-limited per (room, IP) via the native CLAIM_LIMITER binding (the one
// password-guessing surface). On success, rebinds the participant's secret_hash
// to THIS device's cookie secret (minting one if absent) and sets the cookie.
//
// v1 single-secret semantics: the previous device's cookie stops matching (it
// becomes a lurker and can re-claim). Documented limitation.

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { buildSecretCookie, readSecretCookie } from '@/lib/rooms/cookies';
import { generateSecret } from '@/lib/rooms/crypto';
import {
  clientIp,
  isSecureRequest,
  readJsonBody,
  requireJsonContentType,
} from '@/lib/rooms/handler-utils';
import { claim } from '@/lib/rooms/identity';
import { claimRateLimitKey, cloudflareRateLimiter } from '@/lib/rooms/rate-limit';

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

  const participantId = typeof body.participantId === 'string' ? body.participantId : '';
  const password = typeof body.password === 'string' ? body.password : undefined;
  if (!participantId) {
    return Response.json({ error: 'participantId is required' }, { status: 400 });
  }

  // Rebind onto this device's secret (mint one if the device has none yet).
  const existing = readSecretCookie(request.headers.get('cookie'));
  const newSecret = existing ?? generateSecret();

  const limiter = cloudflareRateLimiter(env.CLAIM_LIMITER);
  const key = claimRateLimitKey(roomId, clientIp(request));

  const result = await claim(env.DB, roomId, participantId, password, newSecret, limiter, key);

  if ('error' in result) {
    const status = result.error === 'rate_limited' ? 429 : result.error === 'not_found' ? 404 : 401;
    return Response.json({ error: result.error }, { status });
  }

  return Response.json(
    { you: { participantId: result.youId } },
    {
      headers: {
        'Set-Cookie': buildSecretCookie(roomId, newSecret, { secure: isSecureRequest(request) }),
      },
    },
  );
}

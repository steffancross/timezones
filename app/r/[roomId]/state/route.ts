// GET /r/:roomId/state — the room-state read, extended from spec 1's
// readRoomState with `you: { participantId } | null` resolved from the cookie.
// Ensures the per-room cookie exists on first contact (so the visitor has a
// stable identity to claim onto later) without creating a participant row — a
// cookie-but-no-row visitor is a lurker. Bumps last_seen_at on a resolve.
//
// force-dynamic so OpenNext's incremental cache never serves one visitor's `you`
// (or a stale lurker null) to another.

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { buildSecretCookie, readSecretCookie } from '@/lib/rooms/cookies';
import { generateSecret } from '@/lib/rooms/crypto';
import { readRoomState, touchRoom } from '@/lib/rooms/db';
import { isSecureRequest } from '@/lib/rooms/handler-utils';
import { resolveMe } from '@/lib/rooms/identity';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
): Promise<Response> {
  const { roomId } = await params;
  const { env } = getCloudflareContext();
  const db = env.DB;

  const state = await readRoomState(db, roomId);
  if (!state) return Response.json({ error: 'room not found' }, { status: 404 });

  // Bump last_active_at on every fetch so view-only rooms (set hours once,
  // never edited again) survive as long as someone keeps opening them.
  await touchRoom(db, roomId);

  // Ensure a cookie exists; mint one for first-time visitors.
  const existing = readSecretCookie(request.headers.get('cookie'));
  const secret = existing ?? generateSecret();

  const me = await resolveMe(db, roomId, existing);
  const body = { ...state, you: me ? { participantId: me.participantId } : null };

  const headers = existing
    ? undefined
    : { 'Set-Cookie': buildSecretCookie(roomId, secret, { secure: isSecureRequest(request) }) };
  return Response.json(body, { headers });
}

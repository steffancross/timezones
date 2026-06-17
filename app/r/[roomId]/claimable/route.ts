// GET /r/:roomId/claimable — the new-device recovery picker's list: each
// participant's name, a distinguisher (timezone), and whether it has a password.
// Public and safe — never returns secrets or hashes. No cookie needed (you're
// recovering precisely because this device has no identity yet).

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { listClaimable } from '@/lib/rooms/identity';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> },
): Promise<Response> {
  const { roomId } = await params;
  const { env } = getCloudflareContext();
  const claimable = await listClaimable(env.DB, roomId);
  return Response.json({ claimable });
}

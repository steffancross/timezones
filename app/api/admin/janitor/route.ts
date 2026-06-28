// Manual trigger for the inactivity-TTL janitor (spec 1). There is no cron —
// the TTL is soft/best-effort. Hit this on whatever cadence you like:
//
//   curl -X POST -H "Authorization: Bearer $ADMIN_JANITOR_TOKEN" \
//        https://worldtimezones.net/api/admin/janitor
//
// Guarded by a Worker secret (ADMIN_JANITOR_TOKEN, set via `wrangler secret put`
// for prod and in .dev.vars for local dev) — NOT a NEXT_PUBLIC env var. Returns
// the deleted counts as JSON. The two-DELETE logic lives in runJanitor so it's
// tested directly; this handler is a thin auth wrapper.
//
// Zero-code fallback if you'd rather not use the endpoint:
//   wrangler d1 execute worldtimezones-rooms --remote --command \
//     "DELETE FROM participants WHERE room_id IN (SELECT id FROM rooms WHERE last_active_at < <cutoff>); \
//      DELETE FROM rooms WHERE last_active_at < <cutoff>;"

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { extractBearerToken, secretsMatch } from '@/lib/rooms/admin-auth';
import { runJanitor } from '@/lib/rooms/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  const presented = extractBearerToken(request.headers.get('Authorization'));

  if (!(await secretsMatch(presented, env.ADMIN_JANITOR_TOKEN))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const deleted = await runJanitor(env.DB);
  return Response.json({ ok: true, deleted });
}

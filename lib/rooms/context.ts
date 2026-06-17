// The single place this app reaches into the Cloudflare request context for the
// Availability Room store. Kept separate from ./db so the pure D1 operations
// stay importable in the worker-pool tests without pulling in OpenNext.

import { getCloudflareContext } from '@opennextjs/cloudflare';

/** The D1 binding. Call inside a request/route handler, never at module top level. */
export function getDb(): D1Database {
  return getCloudflareContext().env.DB;
}

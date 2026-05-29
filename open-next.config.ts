import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache';

export default defineCloudflareConfig({
  // Read-only incremental cache backed by Workers Static Assets. This is what serves the
  // prerendered HTML for /convert/[slug] etc. without re-rendering on every request — it writes
  // ZERO KV/R2 entries (the cache files ship in the static-assets bundle). We previously used
  // kv-incremental-cache, which wrote one KV entry per page per deploy and blew Cloudflare's
  // 1k-writes/day free quota (429 on deploy); see #49. No revalidation by design — pair pages
  // are fully static. If true ISR is ever needed, switch to r2-incremental-cache (NOT kv).
  incrementalCache: staticAssetsIncrementalCache,
  // Short-circuit cached routes before loading the NextServer JS — cold-start / CPU win.
  enableCacheInterception: true,
});

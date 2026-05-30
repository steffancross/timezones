import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache';

export default defineCloudflareConfig({
  // Writable incremental cache backed by an R2 bucket (binding `NEXT_INC_CACHE_R2_BUCKET`),
  // fronted by a per-colo regional cache (Cloudflare Cache API). This serves the prerendered HTML
  // for /convert/[slug] AND persists the Tier1×Tier2 long-tail pages, which are `dynamicParams`
  // on-demand renders (~15.6k slugs not in generateStaticParams). Under the previous read-only
  // static-assets backend those long-tail renders were NEVER cached, so every crawler hit re-ran
  // the full Converter SSR (~400ms CPU). With R2 each renders at most once per build, then serves
  // cheap from cache.
  //
  // Why R2, not KV: the old "kv-incremental-cache → 429 on deploy" trap (#49) was a FREE-plan
  // limit (1k KV writes/DAY; one deploy writes ~4.8k entries). On Workers Paid (1M writes/MONTH)
  // KV is viable, but R2 wins on storage headroom (10GB free vs KV's 1GB; ~20k HTML+RSC entries
  // run 2–4GB) and on cleanup (R2 lifecycle rules age out orphans; KV has no age-based expiry).
  //
  // Deploy safety is automatic: R2 cache keys are `${prefix}/${OPEN_NEXT_BUILD_ID}/${hash}`, so a
  // new build reads/writes a fresh namespace and can never serve stale HTML / dead JS-chunk refs
  // from a prior build. Old-build entries are orphaned (not served) and reaped by a 30-day R2
  // lifecycle rule. No revalidation by design — pair pages are fully static (no `revalidate`), so
  // no tag cache / queue override is needed.
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: 'long-lived' }),
  // Short-circuit cached routes before loading the NextServer JS — cold-start / CPU win.
  enableCacheInterception: true,
});

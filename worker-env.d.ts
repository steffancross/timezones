// Augments the wrangler-generated `CloudflareEnv` (worker-configuration.d.ts)
// with Worker SECRETS, which `wrangler types` can't see because secrets aren't
// declared in wrangler.jsonc. Merged via global interface declaration merging.
// Committed (unlike .dev.vars) so typecheck/CI sees it on every machine.
//
// Bindings (DB, R2, etc.) come from wrangler.jsonc via `pnpm cf-typegen` — do
// NOT add those here.

interface CloudflareEnv {
  /** Bearer token guarding POST /api/admin/janitor. `wrangler secret put ADMIN_JANITOR_TOKEN`. */
  ADMIN_JANITOR_TOKEN: string;
}

// Registers the virtual `cloudflare:test` module's types (env, applyD1Migrations,
// …) for tsc — they live in the package's ./types subpath, which the main entry
// doesn't pull in.
/// <reference types="@cloudflare/vitest-pool-workers/types" />

// Test-only: type the extra binding the workers config injects for migrations.
// `cloudflare:test`'s `env` is `Cloudflare.Env`, so we augment that namespace.
// Harmless in prod (the binding simply isn't present at runtime there).

declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: import('@cloudflare/vitest-pool-workers').D1Migration[];
  }
}

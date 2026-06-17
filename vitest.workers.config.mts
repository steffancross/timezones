// Integration tests run INSIDE the Workers runtime (workerd via Miniflare) with
// a real local D1 — separate from the browser-mode unit config (vitest.config.ts),
// since a Chromium pool and a workerd pool can't share one project. Run with
// `pnpm test:integration`.
//
// This file is `.mts` (not `.ts`) on purpose: @cloudflare/vitest-pool-workers is
// ESM-only, and without `"type": "module"` in package.json Vite would bundle a
// `.ts` config as CommonJS and `require()` it, which fails on an ESM-only dep.
//
// We declare the D1 binding directly in miniflare options rather than via
// `wrangler: { configPath }`, so the pool doesn't try to load the OpenNext
// `main` worker (a build artifact) — these tests exercise the pure db.ts
// functions against `env.DB`, not the app worker. Migrations are read at config
// time and passed in as a binding, then applied per-worker in the setup file.

import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(new URL('./migrations', import.meta.url).pathname);
      return {
        miniflare: {
          compatibilityDate: '2026-05-14',
          compatibilityFlags: ['nodejs_compat'],
          d1Databases: ['DB'],
          bindings: { TEST_MIGRATIONS: migrations },
        },
      };
    }),
  ],
  resolve: {
    alias: { '@': new URL('.', import.meta.url).pathname },
  },
  test: {
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['./tests/integration/apply-migrations.ts'],
  },
});

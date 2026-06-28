// Per-worker setup: apply the committed D1 migrations into the isolated test
// database before any test runs. `TEST_MIGRATIONS` is the binding the workers
// config injects from `readD1Migrations(migrations/)`.

import { applyD1Migrations, env } from 'cloudflare:test';

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

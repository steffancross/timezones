# World Timezones

A fast time zone converter. Add cities and zones, scrub through the day, see day/night and working-hour overlays across every row at once. Built on Next.js 16 + React 19, deployed to Cloudflare Workers via OpenNext.

Production: <https://worldtimezones.net>

## Stack

- **Next.js 16** (App Router, React 19)
- **OpenNext + Cloudflare Workers** for deployment, with KV-backed ISR cache for pair pages
- **Tailwind v4** + **shadcn** primitives
- **Zustand** for the converter store (URL-syncable + localStorage-persisted prefs)
- **Luxon** for time math, **suncalc** for day/night bands
- **MiniSearch** for the city/zone search dropdown
- **Biome** for lint + format (replaces ESLint/Prettier)
- **Vitest** in browser mode (real Chromium, not jsdom) + **Playwright** for E2E
- **PostHog** for analytics, routed through `/ingest/*` to avoid ad-blockers

## Setup

Requires Node 22 and pnpm 9 (Corepack-pinned).

```bash
nvm use 22
pnpm install

# Env
cp .env.example .env.local
# Fill in NEXT_PUBLIC_POSTHOG_KEY at minimum; the rest can stay as-is for local dev

# Data files (cities.json and search-index.json are checked in,
# but if you ever need to rebuild them):
pnpm data:cities    # Rebuilds data/cities.json from GeoNames (slow, ~30s)
pnpm data:search    # Rebuilds public/search-index.json (fast)

pnpm dev
```

Visit <http://localhost:3000>.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Next dev server (no data rebuild) |
| `pnpm build` | `data:build` + `next build` |
| `pnpm start` | Serve a production build with `next start` |
| `pnpm preview` | OpenNext local Cloudflare Worker preview at `:8787` |
| `pnpm deploy` | OpenNext build + `wrangler deploy` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | Biome check |
| `pnpm lint:fix` | Biome check with autofix |
| `pnpm format` | Biome format |
| `pnpm test` | Vitest unit tests (browser mode, Chromium) |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:e2e` | Playwright E2E (builds and starts the app itself) |
| `pnpm ci` | `typecheck` + `lint` + `test` + `test:e2e` — mirrors GitHub Actions |
| `pnpm data:cities` | Rebuild `data/cities.json` from GeoNames |
| `pnpm data:search` | Rebuild `public/search-index.json` |
| `pnpm data:build` | `data:cities` then `data:search` |
| `pnpm cf-typegen` | Regenerate Cloudflare worker type bindings |

Run a single Vitest file: `pnpm vitest run tests/unit/store/converter.test.ts`.

## Architecture overview

The single source of truth for visuals is `markdowns/E/design_handoff_converter/` (not in source control; lives locally). For deeper architectural notes — token system, store split, time math, search index loading — see [CLAUDE.md](./CLAUDE.md).

### Layout

```
app/                 Next App Router pages, sitemaps, robots, error/not-found
components/
  converter/         The interactive converter (Converter, HourStrip, ZoneRow, ...)
  templates/         Page body templates (pair, city, article shells)
  conversions/       Conversions index page components
  cities/            Cities index page components
  site/              Header, footer, breadcrumbs, theme toggle, schema
  ui/                shadcn primitives
lib/
  store/             Zustand store + URL sync + localStorage persistence
  time/              Luxon helpers, DST, suncalc, weekend, working hours
  zones/             Zone resolution + contextual picks (cf-timezone)
  cities/            City resolution + disambiguation
  search/            MiniSearch runtime + config
  conversions/       Conversion index data helpers
  seo/               Metadata helper
  articles/          MDX article loader
  env.ts             Zod-validated env vars
data/
  zones.ts           Hand-curated zones
  cities.json        ~11k cities (built from GeoNames)
  disambiguation.json
  city-tiers.ts
content/articles/    MDX articles
scripts/             Data build scripts (cities, search index)
tests/
  unit/              Vitest in browser mode
  e2e/               Playwright
```

### Deployment

OpenNext bundles the app into a single Cloudflare Worker. Static assets, including the prebuilt `public/search-index.json`, are served via the `ASSETS` binding. Pair pages (`/convert/[slug]`) use ISR cached in a KV namespace (`NEXT_INC_CACHE_KV` in `wrangler.jsonc`).

The home page is `force-dynamic` so it can SSR contextual default zones from `cf-timezone` / `cf-ipcountry` headers. Every `/` request is a Worker invocation — see CLAUDE.md for the path forward if this ever becomes a cost concern.

PostHog ingestion routes through `/ingest/*` rewrites in `next.config.ts` to dodge ad-blockers. If those rewrites ever stop working on Workers, fall back to setting `api_host: 'https://us.i.posthog.com'` directly in `app/providers.tsx`.

## Env vars

All `NEXT_PUBLIC_*`. Validated at import time by Zod in `lib/env.ts` — missing values fail the build loud and early. See `.env.example` for the full set.

In production they live in `wrangler.jsonc` under `vars`. `NEXT_PUBLIC_POSTHOG_KEY` is inlined at build time (it's a `NEXT_PUBLIC_*` var) and does not need to be repeated in `wrangler.jsonc`.

## Data refresh

City data from GeoNames doesn't move quickly. Quarterly is fine:

```bash
pnpm data:cities
pnpm data:search
git add data/ public/search-index.json
git commit -m "data: refresh cities + search index"
```

## Attribution

City data from [GeoNames](https://www.geonames.org/) (CC BY 4.0). Time zone rules from the [IANA Time Zone Database](https://www.iana.org/time-zones). Sunrise/sunset from [suncalc](https://github.com/mourner/suncalc).

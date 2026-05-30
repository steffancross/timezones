# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A timezone converter web app (Next.js 16 / React 19) deployed to Cloudflare Workers via OpenNext. Single converter component is the heart of the app — pages compose it with different initial states (a free landing page, pair pages, city pages, etc., per `markdowns/G/`).

## Toolchain & versions

- **Node 22 required** (`.nvmrc` pins it). `pnpm` will refuse on Node ≤ 20; if you see "Unsupported engine," run `nvm use 22`.
- **pnpm 9** (Corepack-pinned via `packageManager` in `package.json`).
- **Biome** for lint + format (replaces ESLint/Prettier). Config in `biome.json`: 2-space indent, single quotes, semicolons, trailing commas, line width 100.
- **Vitest in browser mode** via `@vitest/browser-playwright` (not jsdom). Unit tests run in real Chromium.
- **Playwright** for E2E only.

## Commands

```bash
pnpm dev                # Next.js dev server (no data build — uses checked-in public/search-index.json)
pnpm build              # next build only — does NOT rebuild data (see "Data files" below)
pnpm data:build         # pnpm data:cities && pnpm data:search — run manually to refresh, then commit the diff
pnpm data:cities        # Rebuild data/cities.json (calls GeoNames; slow)
pnpm data:search        # Rebuild public/search-index.json (197KB MiniSearch index)
pnpm typecheck          # tsc --noEmit
pnpm lint               # biome check .
pnpm lint:fix           # biome check --write .
pnpm format             # biome format --write .
pnpm test               # vitest run (browser mode, chromium)
pnpm test:watch         # vitest --watch
pnpm test:e2e           # playwright test (boots `pnpm build && pnpm start` itself)
pnpm ci                 # typecheck + lint + test + e2e (mirror of GitHub Actions)
pnpm preview            # OpenNext local Cloudflare Worker preview
pnpm deploy             # OpenNext build + wrangler deploy
```

Run a single Vitest file: `pnpm vitest run tests/unit/store/converter.test.ts`. Vitest 4 dropped string reporter aliases — don't pass `--reporter=basic`, it will fail to resolve. The default reporter is fine.

## Architecture

### Data files are checked in, not built in CI

`data/cities.json`, `data/disambiguation.json`, and `public/search-index.json` are committed. `pnpm build` runs `next build` only — it does **not** invoke `data:build`. This keeps deploys fast (CSS-only push doesn't pay the GeoNames fetch) and removes GeoNames as a deploy-time dependency. Refresh manually with `pnpm data:build`, then commit the diff. World cities don't churn — quarterly is fine.

### Build spec lives in `markdowns/`

The implementation plan is split into sections A–K with stream files inside. Sections roughly:
- **A**: scaffolding, CI/CD, env validation
- **B**: app shell (globals, theme, layout, header/footer)
- **C**: data + time helpers (zones, cities, search index, Luxon/DST/suncalc/working-hours)
- **D**: Zustand store + URL sync + slug parsing
- **E**: converter UI components (ZoneRow, HourStrip, HourTile, search, settings, etc.)
- **F**: overlays (day/night, working hours, weekend, DST banner)
- **G**: page routes (home, pair, city, disambiguation, articles)

When a markdown and the design handoff conflict on visuals, **the handoff wins**. See `markdowns/E/design_handoff_converter/` — it's the canonical source of truth for spacing, colors, typography, and component anatomy. Markdowns remain authoritative for structure (file layout, store wiring, prop shapes).

The **mobile variant** is defined in `markdowns/E/design_handoff_converter/Mobile compact spec.html` — it's a compact version of the desktop tick strip (smaller heights, sparse labels), NOT a separate slider component.

### Token system (Tailwind v4)

`app/globals.css` has two coexisting palettes wired through one `@theme inline` block:

1. **shadcn surface tokens** — HSL triplets (`--card: 0 0% 100%`). Used by shadcn primitives via `hsl(var(--card))`. The `@theme inline` block maps these to Tailwind color utilities (`bg-card`, `bg-popover`, `text-popover-foreground`, etc.). **Without that block these utilities resolve to nothing → transparent.**
2. **Converter design tokens** — full oklch values (`--brand: oklch(...)`), used directly. Sourced from the design handoff's `styles.css`.

**Do not write `bg-[var(--card,hsl(var(--card)))]`** — that compiles to `background: 0 0% 100%` which is invalid CSS. Use `bg-card` (after the `@theme inline` map) or `bg-[hsl(var(--card))]`.

### State (Zustand)

`lib/store/converter.ts` is the single source. State is split into three persistence boundaries:

- **In-memory only**: `zones`, `homeZoneIndex`, `previewHour`.
- **URL-syncable**: `anchorDate`, `anchorHour`, `format` → query string via `lib/store/to-url.ts` + `components/converter/UrlSync.tsx`.
- **localStorage**: `format`, `overlay` (`{ dayNight, workHours, weekend }`), `workingHours` → `lib/store/persistence.ts` under key `converter_prefs`.

The store auto-derives `anchorDate` from the home zone's local today when zones get seeded or `resetAll()` runs (see `todayInZone` + `isTodayDefault`). Browser-local fallback when no zone is known yet.

**Pre-launch convention: do NOT write migration code for persisted-schema changes.** When the shape of `overlay` or `workingHours` changes, just update the validator. The current single user (the repo owner) clears `localStorage['converter_prefs']` manually.

### Time math

All time arithmetic goes through Luxon (`lib/time/luxon.ts`). Sun position via suncalc (`lib/time/sun.ts`) with a daylight/polar fallback. Working-hours, weekend, and DST helpers are pure functions in `lib/time/`. The strip's BandOverlay computes night/work columns per-row using these.

### Search

MiniSearch index built at `scripts/build-search-index.ts` → `public/search-index.json`. Loaded lazily on input focus via `lib/search/runtime.ts` (deduplicated in-flight promise, retries on error). Search is debounced 80ms in `SearchInput.tsx`.

### Routing & deployment

Next.js App Router. OpenNext adapts to a Cloudflare Worker (`open-next.config.ts`, `wrangler.jsonc` is generated).

**Incremental cache = Workers Static Assets, no KV/R2.** `open-next.config.ts` uses
`staticAssetsIncrementalCache` + `enableCacheInterception: true` (no `kv_namespaces`/R2 binding
in `wrangler.jsonc`). This is a *read-only* cache: the prerendered output ships inside the
static-assets bundle and is read at runtime, so it writes **zero KV/R2 entries** at deploy or
runtime. Cache interception lets the Worker short-circuit cached routes before loading the
NextServer JS (cold-start / CPU win).

Why this exact shape — there are two traps in the history worth knowing:

1. **Don't use `kv-incremental-cache`.** It writes one KV entry per page on deploy. With ~5k
   `/convert/[slug]` pairs, a few deploys/day blew Cloudflare's free-tier 1000-KV-writes/day
   quota → 429 on `wrangler deploy` (PR #49). The static-assets backend avoids this entirely. If
   you ever genuinely need ISR/revalidation, switch to `r2-incremental-cache` (R2 write quota is
   ~1000× higher), **not** KV.
2. **Don't remove the incremental cache to "fix" the KV quota.** PR #49 originally went too far
   and set `defineCloudflareConfig({})` (no cache at all). That didn't just disable ISR — it
   removed the store the Worker *reads prerendered HTML from*, so every `/convert/*` request
   re-rendered on demand (full React SSR + Luxon math). CPU time and request duration spiked.
   The incremental cache is how prerendered pages are served cheaply, ISR or not — it must be
   present. The static-assets backend gives you that without the KV cost.

Revalidation is intentionally OFF (pair pages are fully static; data updates happen via manual
`pnpm data:build` + redeploy). `staticAssetsIncrementalCache` doesn't support revalidation,
which is fine. **Don't re-add `export const revalidate = ...` to these routes** — it's a no-op
with this backend and misleading.

Note `pnpm build` (= `next build`) writes prerendered pages to `.next/`; the static-assets cache
is only *assembled into the deployable bundle* by `opennextjs-cloudflare build` (run via `pnpm
preview` / `pnpm deploy`). Inspecting `.open-next/assets` after a bare `next build` is
misleading — it's stale until the OpenNext build runs.

Verify a cache regression via Workers Observability **CPU time / request duration** on
`/convert/*`, not `cf-cache-status` — interception serves from the Cache API inside the Worker,
which never emits `cf-cache-status` (see the Production caching section).

**PostHog is called directly at `https://us.i.posthog.com`** (see `app/providers.tsx`). The original `/ingest/*` rewrite trick (to dodge ad blockers) does **not** work on OpenNext/Cloudflare — external rewrites become `308` redirects, the browser follows them to the PostHog domain, and ad blockers kill the request anyway. Ad-blocker users (~20–30% of a tech audience) won't generate events under this setup. **Follow-up**: if the analytics gap matters, replace `api_host` with a same-origin path served by a Worker-side proxy at `app/ingest/[[...path]]/route.ts` that `fetch`-es PostHog server-side. That sidesteps the redirect since the outbound call is made by the Worker, not the browser.

The home page (`app/page.tsx`) is `force-dynamic` so it can read `cf-timezone` / `cf-ipcountry` headers and SSR contextual default zones per visitor. Every `/` request is a Worker invocation — fine at launch traffic, worth revisiting if scale becomes a cost concern. Path forward if it does: move contextual picking to a client effect (the Intl-based fallback in `Converter.tsx:51-60` already covers the static case) and let `/` go static.

Env vars are validated via Zod in `lib/env.ts`. Missing `NEXT_PUBLIC_*` values throw at startup. See `.env.example` for the required set.

## Production caching (Cloudflare)

**The real caching mechanism is in-repo, not the dashboard.** Prerendered HTML is served cheaply
by OpenNext's `staticAssetsIncrementalCache` + `enableCacheInterception` (see Routing &
deployment above). **Do not chase `cf-cache-status: HIT` on HTML — it is structurally
unavailable here.** Measure cache health via Workers Observability CPU time / request duration
instead.

**There are NO dashboard Cache Rules deployed — they were removed deliberately.** This repo's
architecture is Worker-first: *Workers run before Cloudflare's edge cache*, so a
Worker-generated response never reaches the Cache-Rule layer at all (the tell: those responses
emit **no `cf-cache-status` header, not even `BYPASS`**). An earlier iteration kept a
`Caching → Cache Rules` rule (match `/convert/*`, `/time-in/*`, etc.; exclude `_rsc=` /
`rsc:1` / `next-router-prefetch`) plus a `Vary`-strip transform rule. Both were **no-ops** for
these routes for the reason above and have been deleted. **Do not re-add them** unless a route
is ever served as a true static asset (not via the Worker) — at which point you'd want the
RSC-exclusion + `Vary`-strip back to avoid HTML-vs-RSC cache-key collisions. Until then they buy
nothing.

**RSC prefetch is disabled app-wide (`prefetch={false}` on every `<Link>`).** App Router
prefetches each in-viewport link's RSC payload on page load. Those `?_rsc=` requests hit the
Worker uncached (interception serves prerendered HTML, not partial prefetch payloads) → full
NextServer re-render + Luxon math per prefetch. On link-dense pages (pair grids, `RelatedPairs`,
`BrowseMatrix`, etc.) that was a prefetch storm and the dominant CPU line — *not* the
incremental-cache backend. Pages are statically cached and fast, so on-click navigation is plenty
fast without prefetch. **Keep new `<Link>`s `prefetch={false}`** unless there's a measured reason
to prefetch a specific high-intent link.

**Homepage (`/`) is intentionally NOT cached**: `force-dynamic` reads
`cf-timezone`/`cf-ipcountry` per visitor. Every visit = one Worker invocation. Worth this cost
for SEO/UX at launch; revisit if `/`-only Worker volume becomes the dominant cost line.

**Plan**: Workers Paid ($5/mo). Required after the free plan's 10ms CPU cap was hit during a
Lighthouse + Googlebot-crawl combo on the pre-SSG pair pages. Free plan was structurally too
tight for any cold-isolate SSR involving Luxon timezone math; paid plan's 50ms default budget
is comfortable.

## Future optimization paths

Not urgent — site is fast and within budget — but worth knowing about:

- **Drop `force-dynamic` from `/`**. Lets the homepage SSG with a static fallback (e.g.
NY/London/Tokyo from `lib/zones/contextual.ts` FALLBACK), then re-seed contextual zones from
`Intl.DateTimeFormat().resolvedOptions().timeZone` in a small client effect. Brief flash for
non-US visitors. Trade: lose per-visitor SSR HTML, gain Worker invocations dropping to ~zero
for the highest-traffic route.
- **Defer day/night band rendering to client**. `HourStrip`'s `BandOverlay` calls
`getNightHours` (SunCalc) at SSR; move to a `useEffect`. Cuts 2–3 SunCalc calls per SSR. Tiny
visual delay on first paint for the soft gradient overlay; structure unchanged. 
- **Precompute night hours at build time**. `getSunTimes` is deterministic given (zone, date,
lat, lng). Generate a static JSON for popular (zone, month) pairs during the data:build step;
replace the runtime calc with a lookup. Removes SunCalc from the Worker hot path entirely.
- **Inline timezone offset math in `HourStrip`'s columns useMemo**. The current `anchorToZones`
  makes ~7 Luxon ops per column = ~170 ops/zone for 24 columns. For pure hour-shifting, a single
  `currentOffsetBetween` + arithmetic is 5–10× faster. Keep Luxon for date-boundary logic where
it earns its weight (DST transitions, etc.).
- **Bundle analyzer pass**. Run `@next/bundle-analyzer` on the main app chunks — one chunk
(`09ymw6s-_~7w~.js` in current lighthouse reports) shipped 40 KB with 99% unused. Almost
certainly a route-specific chunk being preloaded too eagerly. Likely MDX runtime or
PairContent.
- **PostHog reverse-proxy via Worker**. PostHog is currently called directly at
`https://us.i.posthog.com`, killed by ad blockers for ~20–30% of visitors. A Worker-side proxy
at `app/ingest/[[...path]]/route.ts` would route through same-origin and recover those events.
Trade: per-event Worker invocation cost. Only worth doing if analytics gap matters.

### Path alias

`@/*` → repo root (configured in both `tsconfig.json` and `vitest.config.ts`). Use it for everything outside the current directory: `import { useConverterStore } from '@/lib/store/converter'`.

## Conventions learned through review

- **Hover preview is cross-row vertical highlighting**: hovering any tile sets `previewHour = column.homeHour`, which causes every row's tile at that same `homeHour` index to light up. On mobile, `onPointerDown` triggers the same effect for tap.
- **Per-column visual state, not per-row**: weekend recolor applies per column based on each column's `localDate`, so a Fri→Sat boundary mid-row recolors only the Sat tiles + the Sat portion of the baseline. Apply the same instinct for any state that can straddle a date boundary.
- **`zones[0]` is the home zone in practice**, even though `homeZoneIndex` exists. `Converter.tsx` reads `zones[0]?.iana` directly. All store bootstrap paths (`initialize`, `setZones`, first-zone `addZone`) keep `homeZoneIndex` in sync at `0` when zones are non-empty, so the invariant "non-empty zones ⇒ `homeZoneIndex !== null`" holds — rely on either field but pick one consistently if you ever extend reordering.
- **Recolor over text labels**: prefer recoloring existing elements (ticks, baselines, labels) to indicate state rather than adding floating text labels. Both the weekend and working-hours indicators followed this — there is no "WEEKEND" or "working" floating label.
- **Strip is `tick` style only** — variants `tiles`, `gradient`, `pills` from `markdowns/E/design_handoff_converter/variants.css` are not used.

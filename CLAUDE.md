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

`data/cities.json`, `data/disambiguation.json`, `data/holidays.json`, and `public/search-index.json` are committed. `pnpm build` runs `next build` only — it does **not** invoke `data:build`. This keeps deploys fast (CSS-only push doesn't pay the GeoNames fetch) and removes GeoNames as a deploy-time dependency. Refresh manually with `pnpm data:build`, then commit the diff. World cities don't churn — quarterly is fine.

`data/holidays.json` is fetched from the free **Nager.Date** API by `scripts/build-cities/04-fetch-holidays.ts` (`pnpm data:holidays`, also part of `data:build`) for the current year, only for country codes that appear in our data (city `country_code` ∪ zone `countries`). It's deliberately **build-time + committed**, not a runtime call — pages are static, so it's rendered as a *current-year calendar* (`HOLIDAYS_YEAR`), never an "upcoming" list that would bake build-time "now" and go stale. Nager returns **204** for countries it has no data for (much of Africa/Middle East/Asia — ~46 of 122 skip cleanly) and **404** for invalid codes; the loader and components just render nothing for a missing country. **Refresh annually** (and at the year rollover) by re-running `pnpm data:holidays`. `lib/cities/countries.ts` likewise now emits `COUNTRY_INFO` (name + phone/capital/population) with a derived name-only `COUNTRIES`; regenerate via the one-shot `scripts/build-cities/00-fetch-countries.ts`.

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

**Incremental cache = R2 + regional cache.** `open-next.config.ts` uses
`withRegionalCache(r2IncrementalCache, { mode: 'long-lived' })` + `enableCacheInterception: true`,
with an R2 bucket bound as `NEXT_INC_CACHE_R2_BUCKET` in `wrangler.jsonc`. R2 is a *writable*
store, so it serves the prerendered curated pages **and** persists the on-demand long-tail
renders (see "Why R2, and why this shape" below). The regional-cache wrapper fronts R2 with the
per-colo Cache API so hot pages are served colo-local instead of paying an R2 read each hit.
Cache interception lets the Worker short-circuit cached routes before loading the NextServer JS
(cold-start / CPU win).

Why R2, and why this shape — history + the reason it's writable now:

1. **The route is only partly prerendered.** `app/convert/[slug]/page.tsx` has
   `dynamicParams = true` and `generateStaticParams` returns only `getCuratedPairSlugs()`
   (Zone×Zone + Tier1×Tier1, ~4.8k). The Tier1×Tier2 long tail (~15.6k slugs, advertised in the
   sitemap via `getAllPairSlugs()`) renders **on demand**. Under the old read-only
   `staticAssetsIncrementalCache` those renders were never persisted, so every crawler hit re-ran
   the full Converter SSR (~400ms CPU). A *writable* backend caches them after the first render.
2. **Why R2, not KV.** The old `kv-incremental-cache` 429-on-deploy trap (PR #49) was a **free-plan**
   limit: 1000 KV writes/**day**, and one deploy writes ~4.8k entries (one per prerendered page).
   On **Workers Paid** (1M writes/**month**, no daily cap) that specific failure is gone, so KV is
   no longer disqualified — but R2 still wins here on **storage headroom** (10GB free vs KV's 1GB;
   ~20k HTML+RSC entries run 2–4GB at full warm) and **cleanup** (R2 lifecycle rules age out
   orphans; KV has no age-based expiry). R2 is also OpenNext's recommended incremental-cache
   default (KV is recommended only for the *tag* cache, which we don't use). At our scale R2 is
   $0 (free tier). **If you ever reconsider KV, remember the win/loss is plan-dependent — the
   "never KV" rule was a free-plan artifact, not a hard law.**
3. **Don't remove the incremental cache to "fix" a quota.** PR #49 originally went too far and set
   `defineCloudflareConfig({})` (no cache at all). That removed the store the Worker *reads
   prerendered HTML from*, so every `/convert/*` request re-rendered on demand. CPU and request
   duration spiked. The incremental cache is how prerendered pages are served cheaply — it must be
   present.

**Redeploys are clean automatically — don't engineer around it.** R2 cache keys are
`${prefix}/${OPEN_NEXT_BUILD_ID}/${hash}.${cacheType}` (the regional Cache API keys by build id
too). Each `next build` mints a new build id, so a deploy reads/writes a **fresh namespace** and
can **never serve stale HTML or dead JS-chunk refs** from a prior build. Curated pages are
re-uploaded fresh under the new build id each deploy; the long tail re-warms on first hit. Prior
builds' entries are merely **orphaned** (unreachable, not served), reaped by an **R2
object-lifecycle rule**. The window must exceed the deploy gap so live curated entries are never
prematurely culled (currently **7d** during frequent post-launch deploys; raise toward **30d** as
cadence slows — and bump it up *before* any planned quiet stretch longer than the window). If a
curated entry ever is culled during a quiet period it self-heals — re-renders once and re-caches,
never a 404. Bucket: `worldtimezones-incremental-cache`.

Revalidation is intentionally OFF (pair pages are fully static; data updates happen via manual
`pnpm data:build` + redeploy). No `revalidate` ⇒ no tag cache / queue override needed. **Don't
add `export const revalidate = ...` to these routes** — pages refresh on deploy via the build-id
namespace flip, so it's unnecessary and (with no queue override) misleading.

**`/dst` STALENESS (known, accepted for now — no DST transition due soon):** `/dst` previously had
`export const revalidate = 86400`, which with no queue override couldn't revalidate and instead
logged `FatalError: Dummy queue is not implemented` on every stale-window hit (page still served
fine — just noise). (R2 is writable, but revalidation still needs a queue override we don't have —
so re-adding `revalidate` would bring the dummy-queue error back, not fix anything.) That line was removed, so the error is
gone and `/dst` is now fully static like the other SSG'd routes. **The underlying tradeoff
remains**: `/dst` is a *pure server render* — `now = DateTime.now()` is captured at BUILD time and
`getNextTransition(zone, now)` bakes each zone's next transition date into the HTML as text +
`Event` JSON-LD. It is NOT client-recomputed (unlike the `/convert/*` converter, which self-heals
on hydration). So with no revalidation, `/dst` shows stale "next transition" dates between
deploys — once a transition passes, it keeps showing the past one until a redeploy. If/when that
matters: either a low-frequency scheduled `pnpm deploy` (transitions are months apart, weekly is
plenty), or move `getNextTransition` to a client `useEffect` so the page self-heals like the
converter. r2-incremental-cache + a queue (real ISR) is overkill for one page. **Do NOT re-add
`revalidate` to "fix" the staleness — it can't work here and only brings the dummy-queue error
back.** Code/calculation changes are unaffected by any of this — every deploy is a full re-render,
so fixes ship the moment you deploy.

Note `pnpm build` (= `next build`) writes prerendered pages to `.next/`; those are only *populated
into the R2 incremental cache* by `opennextjs-cloudflare build` + deploy (run via `pnpm preview` /
`pnpm deploy`). Inspecting `.open-next/` after a bare `next build` is misleading — the cache isn't
assembled until the OpenNext build runs.

Verify a cache regression via Workers Observability **CPU time / request duration** on
`/convert/*`, not `cf-cache-status` — interception serves from the Cache API inside the Worker,
which never emits `cf-cache-status` (see the Production caching section).

**PostHog is called directly at `https://us.i.posthog.com`** (see `app/providers.tsx`). The original `/ingest/*` rewrite trick (to dodge ad blockers) does **not** work on OpenNext/Cloudflare — external rewrites become `308` redirects, the browser follows them to the PostHog domain, and ad blockers kill the request anyway. Ad-blocker users (~20–30% of a tech audience) won't generate events under this setup. **Follow-up**: if the analytics gap matters, replace `api_host` with a same-origin path served by a Worker-side proxy at `app/ingest/[[...path]]/route.ts` that `fetch`-es PostHog server-side. That sidesteps the redirect since the outbound call is made by the Worker, not the browser.

The home page (`app/page.tsx`) is `force-dynamic` so it can read `cf-timezone` / `cf-ipcountry` headers and SSR each visitor's contextual default rows server-side (no client reorientation). Those rows are seeded as **representative CITIES, not zones**: the curated per-country map (`pickContextualZones`, `lib/zones/contextual.ts`) is resolved to each zone's most-popular city by `pickContextualHomeRefs` → `ianaToHomeRef` (zone fallback when a zone has no city). So rows read as friendly place names ("Berlin", "Los Angeles") rather than zone names, **and** an uncurated zone (Berlin, Madrid, Toronto…) resolves to its city instead of fabricating a bogus `kind:'zone'` slug — that fabrication is what `getZoneById` threw on and 500'd the route for whole regions (e.g. German visitors). The heading stays zone-based (`getZoneByIana(visitorIana)` → "Pacific Time"), falling back to the city name when the visitor's zone isn't curated. Every `/` request is a Worker invocation — fine at launch traffic, worth revisiting if scale becomes a cost concern: move contextual picking to a client effect and let `/` go static (trade: a brief reorientation flash on first paint — see the "Drop `force-dynamic`" item below).

Env vars are validated via Zod in `lib/env.ts`. Missing `NEXT_PUBLIC_*` values throw at startup. See `.env.example` for the required set.

## Production caching (Cloudflare)

**The real caching mechanism is in-repo, not the dashboard.** Prerendered HTML is served cheaply
by OpenNext's R2 incremental cache + regional cache + `enableCacheInterception` (see Routing &
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

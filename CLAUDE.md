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
pnpm build              # Runs data:build then next build
pnpm data:build         # pnpm data:cities && pnpm data:search — required before `next build` from scratch
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

Next.js App Router. OpenNext adapts to a Cloudflare Worker (`open-next.config.ts`, `wrangler.jsonc` is generated). PostHog ingestion is routed through `/ingest/*` rewrites in `next.config.ts` to avoid ad-blocker false positives — 400/401s from these in dev are environmental and harmless.

The home page (`app/page.tsx`) is `force-dynamic` so it can read `cf-timezone` / `cf-ipcountry` headers and SSR contextual default zones per visitor. Every `/` request is a Worker invocation — fine at launch traffic, worth revisiting if scale becomes a cost concern. Path forward if it does: move contextual picking to a client effect (the Intl-based fallback in `Converter.tsx:51-60` already covers the static case) and let `/` go static.

Env vars are validated via Zod in `lib/env.ts`. Missing `NEXT_PUBLIC_*` values throw at startup. See `.env.example` for the required set.

### Path alias

`@/*` → repo root (configured in both `tsconfig.json` and `vitest.config.ts`). Use it for everything outside the current directory: `import { useConverterStore } from '@/lib/store/converter'`.

## Conventions learned through review

- **Anchor is intentionally not settable from the UI** — neither tile clicks nor the (now removed) mobile slider set an anchor. The AnchorPill still exists for the URL-driven anchor case (`?h=N`), but tiles only fire hover preview (`previewHour`).
- **Hover preview is cross-row vertical highlighting**: hovering any tile sets `previewHour = column.homeHour`, which causes every row's tile at that same `homeHour` index to light up. On mobile, `onPointerDown` triggers the same effect for tap.
- **Per-column visual state, not per-row**: weekend recolor applies per column based on each column's `localDate`, so a Fri→Sat boundary mid-row recolors only the Sat tiles + the Sat portion of the baseline. Apply the same instinct for any state that can straddle a date boundary.
- **`zones[0]` is the home zone in practice**, even though `homeZoneIndex` exists. `Converter.tsx` reads `zones[0]?.iana` directly. All store bootstrap paths (`initialize`, `setZones`, first-zone `addZone`) keep `homeZoneIndex` in sync at `0` when zones are non-empty, so the invariant "non-empty zones ⇒ `homeZoneIndex !== null`" holds — rely on either field but pick one consistently if you ever extend reordering.
- **Recolor over text labels**: prefer recoloring existing elements (ticks, baselines, labels) to indicate state rather than adding floating text labels. Both the weekend and working-hours indicators followed this — there is no "WEEKEND" or "working" floating label.
- **Strip is `tick` style only** — variants `tiles`, `gradient`, `pills` from `markdowns/E/design_handoff_converter/variants.css` are not used.

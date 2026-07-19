---
title: Local Setup
description: Get LoopTV running locally for development.
---

# Local Setup

## Prerequisites

- Node.js 22+ (matches CI; Blume and the catalog scripts assume it).
- pnpm 10+ (`corepack enable` will pick up the version pinned in
  `package.json` → `packageManager`).
- (Optional, for catalog rebuilds) `yt-dlp` and/or a `YOUTUBE_API_KEY`.
- (Optional, for local NER fallback) Python 3 + `requirements-ner.txt`.

## First run

```bash
pnpm install
pnpm dev          # Next.js dev server (Turbopack)
```

Open the dev URL. The app uses the checked-in `public/catalog.json`, so no
API key or catalog rebuild is needed for playback.

## Common commands

```bash
pnpm dev              # Next.js dev server
pnpm build            # Production build (next build --webpack)
pnpm start            # Serve the built out/ via wrangler pages dev
pnpm test             # vitest run
pnpm test:coverage    # vitest with coverage
pnpm lint             # biome check .
pnpm format           # biome format --write .
pnpm typecheck        # tsc --noEmit
pnpm check            # biome check . (alias of lint)
```

> **Note:** `pnpm build` deliberately uses `next build --webpack` (Turbopack
> opted out for production). See
> [architecture/decisions.md#adr-007](../architecture/decisions.md#adr-007).

## Catalog rebuild (optional locally)

The checked-in catalog works out of the box. To rebuild it locally, see
[catalog-rebuild.md](catalog-rebuild.md).

## Environment variables

**None required for playback or an existing static catalog.** Catalog refreshes
prefer the YouTube Data API and fall back to yt-dlp; AI tagging runs only for
newly discovered, untagged videos. The optional vars (all CI-only, never in the
browser build) are listed in `.env.example`:

- `YOUTUBE_API_KEY` — repository Actions secret; never reaches build/deploy.
- `FAGW_API_KEY` — free-AI gateway key; only used when untagged videos exist.
- `NEXT_PUBLIC_SAASMAKER_API_KEY` — public SaaS Maker widget key (feedback /
  changelog / testimonials).

See [operations/deployment.md](../operations/deployment.md) for how secrets are
synchronized from Infisical.

## Next steps

- [adding-station.md](adding-station.md) — add a new station by editing
  `stations.json`.
- [catalog-rebuild.md](catalog-rebuild.md) — rebuild the catalog locally.
- [testing.md](testing.md) — test conventions.

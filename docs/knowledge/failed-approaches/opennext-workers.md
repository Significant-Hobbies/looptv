---
title: Cloudflare Workers (OpenNext) for a static app
description: Why the OpenNext Worker bundle was removed in favor of Pages static export.
---

# Failed approach: Cloudflare Workers (OpenNext) for a static app

**Status:** Reverted 2026-04-28 (commit `872175b`). Full retro at
[archive/retros/2026-04-28-workers-to-pages.md](../../archive/retros/2026-04-28-workers-to-pages.md).
Decision record: [ADR-005](../../architecture/decisions.md#adr-005).

## What was tried

LoopTV launched on 2026-04-04 with Vercel as the implied deploy target. Within
days the deploy target shifted to Cloudflare Workers via OpenNext
(2026-04-25, `feat: add CF Workers deployment`) — OpenNext is the "right" way
to run server-side Next.js on Cloudflare.

## Why it failed

The app is **100% client-side** — no API routes, no SSR, no auth. It's a static
shell that loads `catalog.json` client-side and renders YouTube iframes.
OpenNext's Worker bundle added:

- A custom incremental-cache binding (needed for OpenNext, pointless for a
  static app).
- Runtime cold-start latency on every Worker invocation.
- Complexity: `wrangler.toml` Worker bindings, `open-next.config.ts`, ESLint
  ignores for `.open-next/`.

For zero benefit — there was no server logic to run.

## What replaced it

`output: 'export'` (static Next.js export) deployed via
`wrangler pages deploy out` to Cloudflare Pages. The migration diff was
10 files changed, −3,026 lines (mostly OpenNext scaffolding). All 23 tests
passed before commit.

## Collateral damage

- `opengraph-image.tsx` had to be deleted because `ImageResponse` requires a
  server runtime. A static OG image in `public/` replaced it.
- ESLint broke during the migration window because
  `eslint-plugin-react@7.37.5` is incompatible with ESLint 10 flat config.
  All `react/*` rules were disabled as a workaround, and Biome later replaced
  ESLint entirely.
- The old Worker (`looptv.sarthakagrawal927.workers.dev`) was left live
  post-migration, creating a confusing "two live environments" state until it
  was explicitly deleted.

## Reusable lesson

**Match the deploy target to the app's actual runtime shape.** If the app is
static, ship a static export — don't pay Worker cold-start and binding
complexity for server capabilities you don't use. OpenNext is excellent for
server-rendered Next.js on Cloudflare; it is overhead for a static shell.

## Two migrations in three days

The Vercel → Workers → Pages sequence (2026-04-25 → 2026-04-28) was fast
because the app's static shape made the final pivot obvious. The lesson is to
audit the runtime shape *before* picking the deploy target, not after.

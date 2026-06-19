# Retro: Cloudflare Workers (OpenNext) → Cloudflare Pages

**Date:** 2026-04-28  
**Commits:** `872175b`, `f57d656`, `54363bc`, context in AGENTS.md memory note `308`

---

## What happened

LoopTV launched on 2026-04-04 as a Create Next App default, with Vercel as the implied deploy target. Within days the deploy target shifted to Cloudflare:

1. **2026-04-25:** CF Workers via OpenNext added (`feat: add CF Workers deployment`).
2. **2026-04-26:** Vercel references removed; Workers config refined. An incremental cache layer was added for OpenNext static assets.
3. **2026-04-27:** Vercel URLs purged from sitemap/robots/metadata.
4. **2026-04-28:** Full pivot to CF Pages (static export). OpenNext dropped entirely.

Two migrations in three days.

---

## Why it happened

The Workers path was chosen first because OpenNext is the "right" way to run server-side Next.js on Cloudflare. But LoopTV has no server-side logic — no API routes, no SSR, no auth. The app is a static shell that loads `catalog.json` client-side and renders YouTube iframes. OpenNext's Worker bundle added:

- A custom incremental-cache binding (needed for OpenNext, pointless for a static app).
- Runtime cold-start latency on every Worker invocation.
- Complexity: `wrangler.toml` Worker bindings, `open-next.config.ts`, ESLint ignores for `.open-next/`.

Once the team confirmed the app was 100% client-side, Pages with `output: 'export'` was the obvious choice.

---

## What went well

- Migration diff was clean: 10 files changed, −3,026 lines (mostly OpenNext scaffolding). All 23 tests passed before commit.
- CF Pages preview URLs (`pr-N.looptv.pages.dev`) replaced Workers preview domains automatically via the deploy workflow.

## What was painful

- ESLint broke twice during this period: first because `eslint-plugin-react@7.37.5` is fundamentally incompatible with ESLint 10 flat config (memory note `313`). All `react/*` rules had to be disabled as a workaround.
- The Worker (looptv.sarthakagrawal927.workers.dev) was intentionally left live post-migration, creating a confusing "two live environments" state until it was explicitly deleted.
- `opengraph-image.tsx` had to be deleted because `ImageResponse` requires a server runtime. A static OG image replaced it.

## Lessons

See [lessons.md — Static Export](../lessons.md#nextjs-16--static-export) for the hydration and OG-image specifics.

# LoopTV — PROJECT STATUS

Last updated: 2026-08-09

> Detailed feature inventory and timeline live in
> [docs/product/features.md](docs/product/features.md).
> Historical status snapshots live in [docs/archive/](docs/archive/).

## Why / What

Keep LoopTV a stable, lean-back, zero-API-key YouTube TV player. The product
surface is feature-complete for its current scope; active work is maintenance,
catalog freshness, and documentation hygiene.

## Dependencies

- Vite/React static app, YouTube embeds, Cloudflare Pages, and the versioned
  local catalog.
- Ultracite 7.10.2 is an exact development-only Biome preset dependency. Local
  exceptions preserve LoopTV's established Astro, catalog, and playback style;
  it does not affect the static runtime.

## Timeline

- **2026-08-09:** Adopted the verified Ultracite-backed Biome baseline through
  the existing read-only check, with explicit compatibility exceptions and no
  source rewrite, catalog rebuild, production dependency, playback, or deploy
  change.
- **2026-07-31:** Replaced the catalog's always-expanded station tables with
  native disclosures. All 16 station summaries remain visible and
  keyboard-operable while the default 390px page is about 2,940px instead of
  13,975px; expanding a station reveals the same source and video detail.
- **2026-07-29:** Added an owned `/changelog` with verified release outcomes and
  direct GitHub Roadmap and Source links.
- Historical milestones live in [docs/archive/](docs/archive/).

## Products

- Public lean-back TV experience at `https://looptv.significanthobbies.com`.

## Features (shipped)

- Owned editorial product changelog at `/changelog`.
- Exact Ultracite-backed Biome presets with explicit local compatibility
  exceptions; `pnpm check` remains non-writing.
- The complete shipped feature inventory lives in
  [docs/product/features.md](docs/product/features.md).

## Work queue

Open work is tracked only in [GitHub Issues](https://github.com/Significant-Hobbies/looptv/issues).
An open issue is a to-do, a linked pull request is in progress, and merge plus
issue closure makes the work done.

## Shared Fleet Standard

Also read and follow the shared fleet-level agent standard at `../AGENTS.md`. Treat this repository as owned product code: protect production stability, keep changes scoped, verify work, and record durable follow-up tasks when something remains incomplete or blocked.

# agents.md — LoopTV

> **Full documentation lives in [`docs/`](docs/index.md).** This file is the
> concise agent bootloader: purpose, commands, constraints, navigation, and
> maintenance rules. Link, don't duplicate.

## Purpose

TV-like web app that plays random YouTube videos from curated channels —
lean-back, keyless at runtime. 16 stations, 122 channels, ~8,760 curated
videos. Maintainers edit `stations.json`; bi-weekly CI refreshes
`public/catalog.json` via a cache-first YouTube Data API path with yt-dlp
fallback and incremental free-AI tagging. Deployed to Cloudflare Pages at
`tv.significanthobbies.com`.

See [docs/product/overview.md](docs/product/overview.md).

## Stack

- Astro static pages with React islands
- TypeScript (frontend), Python (NER fallback), Bash (catalog pipeline)
- Tailwind CSS v4
- No DB, no auth — static `public/catalog.json` + `localStorage` watched state
- Vitest (unit), Biome (lint/format), Playwright (browser, not in default test)
- Cloudflare Pages static output (`dist/`)
- pnpm

See [docs/architecture/overview.md](docs/architecture/overview.md).

## Essential commands

```bash
pnpm install
pnpm dev                # Astro development server
pnpm build              # Astro production static build
pnpm test               # vitest run
pnpm lint               # biome check .
pnpm typecheck          # astro check

# Catalog (CI-only credentials; checked-in catalog needs no key)
pnpm run build:catalog              # fetch + process (no NER)
pnpm run fetch:all                  # fetch raw JSONL for all sources
pnpm audit:catalog:full             # manual full-history rebaseline (rare)
pnpm run build:ner                  # local BERT NER fallback (not CI)

# Docs (Blume presentation layer — markdown is the source of truth)
pnpm docs:check                     # validate links + structure
pnpm docs:build                     # build static docs site via Blume (if installed)
```

See [docs/development/setup.md](docs/development/setup.md) and
[docs/development/catalog-rebuild.md](docs/development/catalog-rebuild.md).

## Critical constraints

- **No server runtime.** Astro prerenders every route and endpoint into
  `dist/`; do not add an on-request adapter. See
  [docs/architecture/decisions.md#adr-008](docs/architecture/decisions.md#adr-008).
- **No YouTube API key in the browser/build/deploy.** `YOUTUBE_API_KEY` and
  `FAGW_API_KEY` are repository Actions secrets, CI-only, never in the static
  app. See [docs/operations/deployment.md](docs/operations/deployment.md).
- **React is for islands.** Keep content routes static and hydrate only
  playback or browser-state surfaces.
- **Catalog never ships with untagged videos.** The Build Catalog workflow's
  shipping gate refuses to commit if any video is still pending tags. See
  [docs/operations/jobs/build-catalog.md](docs/operations/jobs/build-catalog.md).
- **Catalog audits run before AI tagging.** A rejected catalog spends no
  tagging quota. See
  [docs/operations/catalog-auditability.md](docs/operations/catalog-auditability.md).
- **`stations.json` is the single config file.** Adding a station = edit it +
  rebuild catalog. See [docs/development/adding-station.md](docs/development/adding-station.md).
- **Embed errors 101/150 auto-skip** with no user-visible error (TV feel).
  See [docs/architecture/client-playback.md](docs/architecture/client-playback.md).
- **Do not commit secrets.** `.env*` is gitignored except `.env.example`.
  See [docs/operations/runbooks/rotate-secrets.md](docs/operations/runbooks/rotate-secrets.md).

## Documentation navigation

| Want | Go |
| --- | --- |
| Current objective / blockers / next steps | [STATUS.md](STATUS.md) |
| Product purpose, scope, stats | [docs/product/overview.md](docs/product/overview.md) |
| Shipped features + timeline | [docs/product/features.md](docs/product/features.md) |
| System shape + data flow | [docs/architecture/overview.md](docs/architecture/overview.md) |
| Catalog pipeline how/why | [docs/architecture/catalog-pipeline.md](docs/architecture/catalog-pipeline.md) |
| Client playback + embed errors | [docs/architecture/client-playback.md](docs/architecture/client-playback.md) |
| Architecture decisions (ADRs) | [docs/architecture/decisions.md](docs/architecture/decisions.md) |
| Local setup | [docs/development/setup.md](docs/development/setup.md) |
| Rebuild the catalog | [docs/development/catalog-rebuild.md](docs/development/catalog-rebuild.md) |
| Add a station | [docs/development/adding-station.md](docs/development/adding-station.md) |
| Testing + linting | [docs/development/testing.md](docs/development/testing.md) |
| Deployment + secrets | [docs/operations/deployment.md](docs/operations/deployment.md) |
| CI jobs | [docs/operations/jobs/](docs/operations/jobs/) |
| Runbooks | [docs/operations/runbooks/](docs/operations/runbooks/) |
| Catalog audit rules | [docs/operations/catalog-auditability.md](docs/operations/catalog-auditability.md) |
| External references | [docs/knowledge/external-references.md](docs/knowledge/external-references.md) |
| Engineering lessons | [docs/knowledge/learnings/lessons.md](docs/knowledge/learnings/lessons.md) |
| Failed approaches | [docs/knowledge/failed-approaches/](docs/knowledge/failed-approaches/) |
| Shipped PRDs + retros | [docs/archive/](docs/archive/) |

## Documentation maintenance rules

1. **Markdown in `docs/` is the source of truth.** Blume is only the
   presentation and search layer. Code and executable config remain
   authoritative for implementation details and schedules.
2. **One fact, one home.** Don't duplicate facts that are easily discoverable
   from code — link to the code instead. Don't restate a doc in another doc —
   link.
3. **Mark unknowns explicitly** with `TBD` or an "Unresolved questions" section
   in [STATUS.md](STATUS.md). Do not invent rationale.
4. **Preserve git history** when reorganizing — use `git mv`. Prefer
   `docs/archive/<name>.md` over deletion.
5. **Keep pages focused** — 150–300 lines. Split catch-all pages.
6. **Validate before commit** — run `pnpm docs:check` to catch broken links,
   orphans, and missing index pages.
7. **Adding a doc:** drop a `.md` under the right section, add a one-line link
   from the section's `index.md`, run `pnpm docs:check`. For decisions, follow
   the ADR shape in [docs/architecture/decisions.md](docs/architecture/decisions.md).

<!-- FLEET-GUIDANCE:START -->

## Fleet Guidance

### Adding Tasks
- Track LoopTV work in this repository's GitHub issues or OpenSpec changes.
- Keep cross-project infrastructure work in Fleet Workspace, not SaaS Maker.

### Using SaaS Maker
- Do not use the retired SaaS Maker task queue or API as a system of record.
- Fleet Workspace owns shared project metadata and infrastructure; LoopTV
  remains independently versioned and deployed.

### Free AI First
- Prefer free/local AI paths for routine development and analysis: the `free-ai` gateway, local models, provider free tiers, and cached context.
- Escalate to paid models only when complexity, correctness risk, or missing capability justifies the cost.
- Note any paid-AI use in the task or handoff when it materially affects cost, reproducibility, or future maintenance.

<!-- FLEET-GUIDANCE:END -->

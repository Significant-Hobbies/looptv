---
title: Testing
description: Test conventions, layout, and commands.
---

# Testing

## Commands

```bash
pnpm test             # vitest run (unit)
pnpm test:coverage    # vitest with v8 coverage
pnpm lint             # biome check .
pnpm typecheck        # tsc --noEmit
```

Playwright browser tests exist (`tests/example.spec.ts`, `tests/mobile.spec.ts`,
`playwright.config.ts`) but are not wired into the default `pnpm test` run.

## Layout

Vitest is configured in `vitest.config.ts` and includes:

- `src/**/__tests__/**/*.test.ts`
- `src/**/*.test.ts`
- `scripts/__tests__/**/*.test.ts`

Coverage targets `src/lib/**/*.ts` with thresholds
`lines: 80, functions: 80, branches: 70, statements: 80`.

## What's tested

| Area | Tests |
| --- | --- |
| Catalog client | `src/lib/__tests__/catalog.test.ts`, `catalog-loading.test.ts`, `catalog-quality.test.ts` |
| Stations config | `src/lib/__tests__/stations-schema.test.ts`, `station-builder.test.ts` |
| Watched state | `src/lib/__tests__/watched.test.ts` |
| Source health | `src/lib/__tests__/source-health.test.ts` |
| Playback diagnostics | `src/lib/__tests__/playback-diagnostics.test.ts` |
| YouTube errors | `src/lib/__tests__/yt-errors.test.ts` |
| Catalog pipeline | `scripts/__tests__/catalog.test.ts`, `process-catalog.test.ts`, `catalog-quality.test.ts`, `audit-catalog-health.test.ts`, `validate-catalog-manifest.test.ts`, `full-catalog-rebaseline.test.ts`, `fetch-channel.test.ts`, `fetch-channel-api.test.ts`, `youtube-data-api.test.ts`, `restore-catalog-tags.test.ts`, `summarize-fetch-metrics.test.ts`, `tag-result.test.ts`, `tagging-prompts.test.ts`, `catalog-tag-status.test.ts`, `workflow-cost-gates.test.ts` |

The catalog-pipeline tests read the checked-in `public/catalog.json` and
exercise the same scripts CI runs — they double as a regression guard for
catalog invariants.

## Conventions

- Tests are colocated with code under `__tests__/` (frontend) or in
  `scripts/__tests__/` (pipeline).
- Use `vitest` globals (`describe`, `it`, `expect`) — no imports needed.
- Pipeline tests run in `environment: 'node'`.
- The `@` alias resolves to `src/` (see `vitest.config.ts`).

## Linting & formatting

Biome is the single config (`biome.json`). Notable choices:

- `lint` = `biome check .` (formatter + linter).
- `format` = `biome format --write .`.
- Single quotes, semicolons, 2-space indent, 100-col width.
- Several `a11y` rules are disabled (the player is a custom lean-back surface).
- `public/catalog.json`, `public/catalog-summary.json`, `design.html`,
  `stations.json`, and `src/app/globals.css` are excluded from Biome.

> **Historical note:** ESLint was removed during the Workers → Pages migration
> because `eslint-plugin-react@7.37.5` is incompatible with ESLint 10 flat
> config. Biome replaced it. See
> [archive/retros/2026-04-28-workers-to-pages.md](../archive/retros/2026-04-28-workers-to-pages.md).

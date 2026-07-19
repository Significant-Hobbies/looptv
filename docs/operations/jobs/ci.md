---
title: CI (job)
description: Lint + test gate on push and pull requests.
---

# CI

**File:** `.github/workflows/ci.yml`
**Triggers:** push to `main`/`master`, pull_request against `main`/`master`

## What it does

Single job, `ubuntu-latest`, Node 22:

1. Checkout.
2. Setup Node 22.
3. Prepare pnpm (corepack, pinned version from `packageManager`).
4. `pnpm install --frozen-lockfile`.
5. `pnpm lint` (Biome check).
6. `pnpm test` (Vitest run).

No build step — that's covered by [weekly-quality.md](weekly-quality.md) and
the deploy workflows. CI is the fast feedback gate.

## What's not here

- No catalog rebuild (that's [fetch-catalog-sources.md](fetch-catalog-sources.md)
  + [build-catalog.md](build-catalog.md)).
- No deploy (that's [deploy.md](deploy.md)).
- No docs validation in this workflow — `pnpm docs:check` runs as a CI
  step here, and the dedicated `docs.yml` workflow runs the strict check on
  docs-only changes. See [../runbooks/](../runbooks/).

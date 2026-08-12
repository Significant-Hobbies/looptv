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
5. Install the pinned Lizard complexity analyzer.
6. `pnpm quality`: formatting, lint, types, coverage, unused code, complexity,
   duplication, cycles, dependency advisories, suppressions, docs, build, and
   repository hygiene.

## What's not here

- No catalog rebuild (that's [fetch-catalog-sources.md](fetch-catalog-sources.md)
  + [build-catalog.md](build-catalog.md)).
- No deploy (that's [deploy.md](deploy.md)).
- The dedicated `docs.yml` workflow still runs the strict documentation check
  on docs-only changes. See [../runbooks/](../runbooks/).

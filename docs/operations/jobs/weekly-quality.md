---
title: Weekly Quality Check (job)
description: Monday lint + typecheck + test + build sweep.
---

# Weekly Quality Check

**File:** `.github/workflows/weekly.yml`
**Triggers:** cron `0 9 * * 1` (Mondays 09:00 UTC) + `workflow_dispatch`
**Permissions:** `contents: read`

## What it does

A broader sweep than [CI](ci.md) — runs lint, typecheck, test, **and** build,
so a build regression that doesn't surface on a PR (e.g. a dependency drift)
is caught within a week.

The job is package-manager-agnostic (auto-detects pnpm / npm / yarn from
lockfile presence) but this repo ships `pnpm-lock.yaml`, so it always uses
pnpm.

## Steps

1. Checkout.
2. Setup Node 22.
3. Prepare pnpm (if `pnpm-lock.yaml` exists).
4. Install (frozen lockfile, `--ignore-scripts`).
5. Run each available script: `lint`, `typecheck`, `test`, `build`.
   Missing scripts are skipped with a log line, not a failure.

## Failure handling

Any failing step fails the job. There is no auto-fix or auto-commit — failures
are surfaced for maintainer review.

---
title: Build Catalog (job)
description: Process fetched sources, audit, tag, and commit catalog.json.
---

# Build Catalog

**File:** `.github/workflows/build-catalog.yml`
**Triggers:** `workflow_run` on `Fetch Catalog Sources` completion (success,
main branch) + `workflow_dispatch` (main only)
**Concurrency:** `catalog-build` (cancel-in-progress: false)
**Timeout:** 60 minutes

## What it does

Chained after a successful [Fetch Catalog Sources](fetch-catalog-sources.md)
run. Downloads the 8 shard artifacts, merges them into `data/sources/`,
processes a fresh `catalog.json`, runs both audits, tags untagged videos via
the free-AI gateway, and auto-commits the result.

## Manual dispatch inputs

| Input | Purpose |
| --- | --- |
| `source_run_id` | Reuse a specific successful Fetch Catalog Sources run ID instead of the triggering one |
| `override_audit` | Bypass catalog audit thresholds for an intentional big change (see [catalog-auditability.md](../catalog-auditability.md)) |

## Pipeline (in order)

1. **Validate source run** (only when `source_run_id` is set) — confirms the
   run was a successful `Fetch Catalog Sources` on `main` with all 8 shard
   artifacts live.
2. **Download + merge shards** into `data/sources/`.
3. **Build catalog** — `bash scripts/build-catalog.sh --process-only`
   (`process-catalog.mjs`).
4. **Audit source health** — `audit-catalog-health.mjs` (coverage + invariants).
   Writes a markdown report to the job summary. Respects `override_audit`.
5. **Audit manifest** — `validate-catalog-manifest.mjs --update` (count +
   per-video churn gates). Respects `override_audit`. Writes a diff file for
   the commit message.
6. **Count pending tags** — `catalog-tag-status.mjs`.
7. **Smoke AI gateway** (only if pending ≠ 0) — `smoke-tag-gateway.mjs` with
   `FAGW_API_KEY`. `continue-on-error: true`.
8. **Tag** (only if smoke succeeded and pending ≠ 0) — `tag-videos.mjs`.
   `continue-on-error: true`.
9. **Retry** (only if smoke succeeded and pending still ≠ 0) — one more
   `tag-videos.mjs` pass.
10. **Report** — markdown summary of gateway status + pending counts before /
    after first pass / final.
11. **Save source cache** — `actions/cache/save` for `data/sources`.
12. **Shipping gate** — if pending-final ≠ 0, the job exits non-zero. A catalog
    never ships with untagged videos.
13. **Commit + push** — only if files changed AND pending-final == 0. Commit
    message: `Update catalog: <N> videos` + per-station count diff + per-video
    changelog.

## Secrets

- `FAGW_API_KEY` — only received by this workflow; only called when
  pending-tags ≠ 0.
- `GITHUB_TOKEN` — for `gh api` run validation and the auto-commit.

`YOUTUBE_API_KEY` is **not** received by this workflow — it never re-fetches
sources, it only processes the artifacts from Fetch Catalog Sources.

## Failure modes

| Symptom | Cause | Fix |
| --- | --- | --- |
| Source-health audit fails | Coverage <80% or invariant violation | Re-run Fetch Catalog Sources; if intentional, use `override_audit` |
| Manifest audit fails | Station drop / total drop / churn over threshold | Inspect the per-station diff in the job summary; if intentional, use `override_audit` |
| Gateway smoke fails | Free-AI gateway down | Workflow continues; catalog is not committed (shipping gate). Retry next cycle. |
| Pending tags stuck >0 after retry | Gateway rate-limited or parse failures | Re-run Build Catalog with the same `source_run_id` once the gateway recovers |

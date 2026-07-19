---
title: Full Quality Rebaseline
description: Manual, rare, complete upload-history rescan for the catalog.
---

# Full Quality Rebaseline

## When to run this

Almost never. Normal scheduled refreshes are incremental and reuse the
verified top-set checkpoints. Run a full rebaseline only when:

- A source's ranking is suspect (e.g. an incremental-only baseline that never
  had a full-history scan).
- `stations.json` added a `topPercentile` / `maxVideos` override that should
  re-rank the full history.
- You want to verify the committed top sets against the current channel state.

This is **never scheduled**. It is a manual, bounded, resumable operation.

## Command

```bash
pnpm audit:catalog:full    # node scripts/full-catalog-rebaseline.mjs
```

## Bounds (why the numbers are what they are)

| Control | Default | Purpose |
| --- | --- | --- |
| Global request ceiling | 4,500 | Hard cap; the verified 122-source baseline used 3,467 |
| Request rate | 5 req/s | Polite throttle |
| Per-source checkpoints | on | Resume makes zero requests for completed sources |
| Eligibility filters | applied once | Embedding / duration / 10K-view |
| Percentile + cap | applied once | Per-source `topPercentile` / `maxVideos` (default 200) |

## What it writes

- A `full-history` baseline marker in catalog metadata for each completed
  source.
- A per-source report (public uploads, eligible, selected, top %, view floor,
  request count, checkpoint status) grouped by station — see
  [operations/catalog-quality-audit.md](../catalog-quality-audit.md) for the
  verified baseline numbers.
- `docs/catalog-quality-audit.md` (now at
  `docs/operations/catalog-quality-audit.md`) is the canonical home for the
  audit data.

## Resume behavior

If a run is interrupted, the next run makes **zero requests** for completed
sources and continues with the remaining ones. Checkpoints are keyed by source,
so a partial run is safe to re-run.

## After it completes

1. Inspect the per-source report for any anomaly.
2. Run the normal audits:
   ```bash
   node scripts/audit-catalog-health.mjs
   node scripts/validate-catalog-manifest.mjs --update
   ```
3. Commit `public/catalog.json`, `public/catalog-summary.json`,
   `catalog-manifest.json`, and the updated
   `docs/operations/catalog-quality-audit.md` together.
4. The next scheduled [Fetch Catalog Sources](../jobs/fetch-catalog-sources.md)
   run will reuse the verified top sets and remain incremental.

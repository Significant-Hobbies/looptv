---
title: Fetch Catalog Sources (job)
description: Bi-weekly cache-first YouTube source fetch, sharded across 8 jobs.
---

# Fetch Catalog Sources

**File:** `.github/workflows/fetch-catalog-sources.yml`
**Triggers:** cron `0 6 1,15 * *` (1st & 15th, 06:00 UTC) + `workflow_dispatch`
**Concurrency:** `catalog-fetch` (cancel-in-progress: false)

## What it does

Fetches fresh source metadata for every channel in `stations.json`, sharded
across 8 parallel jobs. Each shard writes its `data/sources/*.jsonl` files to a
`catalog-sources-shard-<N>` artifact (3-day retention). The chained
[Build Catalog](build-catalog.md) workflow downloads and merges them.

## Per-shard environment

| Var | Value | Purpose |
| --- | --- | --- |
| `SHARD_INDEX` / `SHARD_TOTAL` | matrix / 8 | Shard assignment |
| `FETCH_CONCURRENCY` | 2 | In-shard parallelism |
| `CACHE_MAX_AGE_DAYS` | 13 | Freshness gate — complete caches younger than this use zero YouTube requests |
| `YOUTUBE_RECENT_VIDEO_LIMIT` | 250 | Bounded incremental discovery ceiling |
| `YOUTUBE_MAX_REQUESTS_PER_SOURCE` | 20 | Per-source request hard stop |
| `YT_DLP_RETRIES` / `YT_DLP_TIMEOUT_MS` | 2 / 600000 | yt-dlp fallback resilience |
| `RETRY_MISSING` | false | Don't re-fetch missing sources on every run |
| `YOUTUBE_API_KEY` | secret | Only this workflow receives it |

## Behavior

- **Cache-first:** a complete source cache ≤13 days old → zero YouTube requests.
- **Stale/missing:** bounded incremental discovery via the uploads playlist
  (≤250 recent uploads, stop at known IDs, 50-ID metadata batches, ≤20 reqs).
- **Fallback:** if the Data API is unavailable, `yt-dlp --flat-playlist
  --dump-json` runs sequentially per channel (avoids rate-limiting the GitHub
  Actions IP range).
- **Safe preservation:** a valid prior cache is never replaced by a
  failed/incomplete fetch.

See [architecture/catalog-pipeline.md](../../architecture/catalog-pipeline.md)
for the full stage description and quota rationale.

## Output

- 8 `catalog-sources-shard-<N>` artifacts, each containing the `.jsonl` files
  for that shard's handles.
- `if-no-files-found: error` — an empty shard fails the job.

## Failure handling

`fail-fast: false` — one shard failing does not cancel the others. Build
Catalog only runs on `workflow_run.conclusion == 'success'`, so a partial
failure means no catalog rebuild that cycle (by design — a partial source set
would fail the coverage audit anyway).

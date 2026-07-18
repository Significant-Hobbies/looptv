---
title: Rebuilding the Catalog
description: Local and manual catalog rebuild procedures.
---

# Rebuilding the Catalog

The checked-in `public/catalog.json` works with zero API keys. A rebuild is
only needed when you change `stations.json` or want fresher metadata. The full
pipeline is documented in [architecture/catalog-pipeline.md](../architecture/catalog-pipeline.md);
this page is the operator-facing how-to.

## Quick path (process only)

If you already have `data/sources/*.jsonl` cached (or want to reprocess the
existing cache without fetching):

```bash
bash scripts/build-catalog.sh --process-only
```

This runs `process-catalog.mjs` over `data/sources/` and writes
`public/catalog.json` + `public/catalog-summary.json`. No network calls.

## Full local fetch + process

```bash
# Preferred: set YOUTUBE_API_KEY for the cache-first Data API path.
# Without it, the fetcher falls back to yt-dlp.
brew install yt-dlp    # or pip install yt-dlp

bash scripts/fetch-sources.sh        # cache-first fetch → data/sources/*.jsonl
bash scripts/build-catalog.sh --process-only
```

Or via the package script (fetch + process, no NER):

```bash
pnpm run build:catalog
```

## Fetch all sources (compatibility wrapper)

```bash
pnpm run fetch:all      # bash scripts/fetch-all-sources.sh
```

## Local NER tagging (offline fallback)

CI uses the free-AI gateway (`tag-videos.mjs`), not BERT NER. The local NER
path is retained for offline use but installs `torch` (~1GB):

```bash
pip install -r requirements-ner.txt
python3 scripts/extract-tags.py
```

See [knowledge/failed-approaches/bert-ner-noise.md](../knowledge/failed-approaches/bert-ner-noise.md)
for why NER was retired from CI.

## Auditing the result

Before committing a locally rebuilt catalog, run the same audits CI does:

```bash
node scripts/audit-catalog-health.mjs            # source coverage + invariants
node scripts/validate-catalog-manifest.mjs       # count + per-video churn gates
node scripts/validate-catalog-manifest.mjs --update   # audit, then rebaseline
```

See [operations/catalog-auditability.md](../operations/catalog-auditability.md)
for the full rule table and override semantics.

## Full quality rebaseline (manual, rare)

`pnpm audit:catalog:full` scans each source's *complete* upload history. It is
never scheduled and defaults to 5 req/s with a 4,500-request global ceiling and
per-source checkpoints. The verified 122-source baseline used 3,467 requests;
an immediate rerun used zero. See
[operations/catalog-quality-audit.md](../operations/catalog-quality-audit.md)
for the per-source baseline numbers.

## Committing

Commit `public/catalog.json`, `public/catalog-summary.json`, and
`catalog-manifest.json` together. CI auto-commits use the message shape
`Update catalog: <N> videos` plus a per-station count diff and per-video
changelog — follow the same shape for manual commits.

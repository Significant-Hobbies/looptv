---
title: Rotate CI Secrets
description: Rotate YouTube Data API and free-AI gateway keys without exposing values.
---

# Rotate CI Secrets

## Secrets in scope

| Secret | Used by | Source |
| --- | --- | --- |
| `YOUTUBE_API_KEY` | `Fetch Catalog Sources` only | Fleet Infisical project |
| `FAGW_API_KEY` | `Build Catalog` only (when untagged videos exist) | Fleet Infisical project |
| `CLOUDFLARE_API_TOKEN` | `Deploy` | Fleet Infisical project |
| `CLOUDFLARE_ACCOUNT_ID` | `Deploy` | Fleet Infisical project |

All four are repository Actions secrets synchronized from the Fleet Infisical
project. They are never committed to the repo.

## Rotation (no value exposure)

From an Infisical-linked directory:

```bash
# YouTube Data API key
infisical secrets get YOUTUBE_API_KEY --plain | gh secret set YOUTUBE_API_KEY

# Free-AI gateway key
infisical secrets get Free_ai --plain | gh secret set FAGW_API_KEY

# Cloudflare deploy credentials
infisical secrets get CLOUDFLARE_API_TOKEN --plain | gh secret set CLOUDFLARE_API_TOKEN
infisical secrets get CLOUDFLARE_ACCOUNT_ID --plain | gh secret set CLOUDFLARE_ACCOUNT_ID
```

Piping `--plain` output directly into `gh secret set` keeps the value out of
your shell history and the terminal scrollback.

## Verify after rotation

- `YOUTUBE_API_KEY`: trigger
  [Fetch Catalog Sources](../jobs/fetch-catalog-sources.md) manually; check the
  per-shard summary for Data API request counts >0 on a stale source.
- `FAGW_API_KEY`: trigger
  [Build Catalog](../jobs/build-catalog.md) with a run that has pending tags;
  check the "Catalog AI tagging" summary for `Gateway status: ok`.
- `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`: trigger a preview deploy
  from any PR.

## What never to do

- Do not commit any of these values to the repo.
- Do not echo them in workflow logs — the workflows use them via `env:` and
  never print the raw values.
- Do not add them to `.env*` files. `.env*` is gitignored except `.env.example`,
  which documents the names only.

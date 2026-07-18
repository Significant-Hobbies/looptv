---
title: BERT NER for catalog tagging (retired from CI)
description: Why dslim/bert-base-NER was retired from CI tagging in favor of LLM topic tags.
---

# Failed approach: BERT NER for catalog tagging

**Status:** Retired from CI (2026-04-05, commit `8203c0b`). `extract-tags.py`
and `requirements-ner.txt` are retained as a local/offline fallback only.

## What was tried

`scripts/extract-tags.py` ran `dslim/bert-base-NER` via HuggingFace's
`pipeline("ner", aggregation_strategy="max")` on concatenated video
`title + description` (truncated to 512 characters as a cheap token-cap proxy).
The script filtered to `PER` (people) and `LOC` (places) with a 0.8 confidence
threshold.

## Why it failed

- **`ORG` and `MISC` entities are noise for browse.** Initial runs tagged
  brand names, channel names, "Patreon", "Peacock" (`ORG`), and "German",
  "SNL", "American" (`MISC`) — useless for browse/search. Filtering to
  `PER` + `LOC` only was the first mitigation.
- **Even `PER`/`LOC` tags are entity tags, not topic tags.** Browse wants
  "black holes", "stoicism", "startup pitch decks" — not "Derek Muller" or
  "Pasadena". The commit message `8203c0b` is explicit: "too noisy — v2 will
  use zero-shot topic classification instead".
- **`torch` (~1GB install) in CI** inflated the GitHub Actions job for no
  benefit once the LLM gateway path landed.

## What replaced it

`scripts/tag-videos.mjs` — a multi-model fan-out to 7 free-tier LLM providers
(2 concurrent workers each = 14 parallel workers). Produces topic-oriented
tags. See [ADR-006](../../architecture/decisions.md#adr-006) for the decision
record and [architecture/catalog-pipeline.md](../../architecture/catalog-pipeline.md)
for the current pipeline.

## What's retained and why

- `scripts/extract-tags.py` — works offline with no network dependency. Useful
  if the free-AI gateway is down.
- `requirements-ner.txt` — `transformers` + `torch` for the local fallback.
  Never installed in CI.

## Reusable lesson

Entity extraction (NER) and topic classification are different problems. For a
browse/search surface over video titles, **topic tags beat entity tags** unless
the surface is specifically about people/places. If you reach for NER, filter
to the entity types your surface actually uses, and expect a long tail of
noise from `ORG`/`MISC`.

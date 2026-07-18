---
title: Knowledge
description: External references, durable learnings, and failed approaches.
---

# Knowledge

Reusable, evidence-oriented notes. Each entry leans on authoritative external
sources where they exist; we don't re-explain concepts that already have a
definitive source.

## Sections

- [external-references.md](external-references.md) — one-line "what / why it
  matters here / link" entries for the libraries and APIs this repo uses.
- [learnings/](learnings/) — durable engineering lessons evidenced in code or
  git history.
  - [learnings/lessons.md](learnings/lessons.md) — concrete gotchas by area.
  - [learnings/new-things.md](learnings/new-things.md) — open learning notes
    (some `TBD`).
- [failed-approaches/](failed-approaches/) — things we tried and reverted,
  with the reusable lesson in each.
  - [failed-approaches/bert-ner-noise.md](failed-approaches/bert-ner-noise.md)
    — BERT NER retired from CI tagging in favor of LLM topic tags.
  - [failed-approaches/opennext-workers.md](failed-approaches/opennext-workers.md)
    — OpenNext Worker bundle removed for a 100% client-side app.

## Related

- [architecture/decisions.md](../architecture/decisions.md) — the "why" behind
  each active architectural choice (ADRs).
- [archive/retros/](../archive/retros/) — retrospectives on specific
  migrations.

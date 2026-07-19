---
title: LoopTV Knowledge Base
description: Local-first documentation for the LoopTV curated YouTube TV player.
---

# LoopTV Knowledge Base

LoopTV is a TV-like web app that plays random YouTube videos from curated
channels — lean-back, keyless, and static-hosted. This is the canonical,
committed documentation for the project. Markdown here is the source of truth;
[Blume](https://useblume.dev) is only the presentation and search layer.

## Start here

- [Product overview](product/overview.md) — what LoopTV is, who it's for, scope
- [Architecture overview](architecture/overview.md) — system shape and data flow
- [STATUS.md](../STATUS.md) — current objective, active work, blockers, next steps
- [AGENTS.md](../AGENTS.md) — concise agent bootloader (commands + constraints)

## Sections

| Section | What's inside |
| --- | --- |
| [Product](product/overview.md) | Purpose, thesis, in/out of scope, shipped features |
| [Architecture](architecture/overview.md) | System shape, catalog pipeline, client playback, decisions (ADRs) |
| [Development](development/setup.md) | Local setup, catalog rebuild, adding a station, testing, linting |
| [Operations](operations/deployment.md) | Deployment, CI jobs, runbooks, catalog auditability |
| [Knowledge](knowledge/external-references.md) | External references, durable learnings, failed approaches |
| [Archive](archive/prds/) | Shipped PRDs, retros, auto-generated audit context |

## Documentation maintenance rules

1. **Markdown is the source of truth.** Blume renders it; it does not own it.
2. **One fact, one home.** If a fact lives in code (e.g. a script's flag list),
   link to the code instead of restating it. If a fact lives in a doc, do not
   duplicate it in another doc — link.
3. **Mark unknowns explicitly** with `TBD` or an "Unresolved questions" section.
   Do not invent rationale.
4. **Preserve git history** when reorganizing — use `git mv` so moves are
   traceable. Prefer `docs/archive/<name>.md` over deletion.
5. **Keep pages focused** — target 150–300 lines. Split catch-all pages into
   per-topic pages.
6. **Validate before commit** — run `pnpm docs:check` to catch broken links,
   orphans, and missing index pages.

## Adding a new doc

1. Drop a `.md` file under the right section folder.
2. Add a one-line link from the section's `index.md` (or this page if it's a
   top-level section).
3. Run `pnpm docs:check` — the validator will flag broken links and orphans.
4. If the doc records a decision, follow the ADR shape in
   [architecture/decisions.md](architecture/decisions.md).

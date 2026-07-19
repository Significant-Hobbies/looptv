---
title: Override a Catalog Audit Failure
description: When and how to use the catalog audit override for intentional big changes.
---

# Override a Catalog Audit Failure

## When to use this

The catalog audits ([catalog-auditability.md](../catalog-auditability.md)) hard-fail
on suspicious station drops, total drops, replacement churn, coverage below 80%,
or invariant violations. The override exists for **reviewed, intentional** big
swings — not for making red CI green.

Legitimate override scenarios:

- A station was removed from `stations.json`.
- A channel was deleted upstream.
- Quality thresholds were tightened (e.g. raised `minDuration` or
  `topPercentile`).
- A full rebaseline replaced an incremental-only ranked set.

**Never override without eyeballing the per-station diff first.** The job
summary includes the per-station count diff and the per-video changelog
(added/removed/title-changed, with removed titles).

## CI override

Trigger **Build Catalog** via `workflow_dispatch` with the `override_audit`
input checked. Violations are still reported in the job summary but don't fail
the job, and the manifest is rebaselined to the new catalog.

## Local override

```bash
CATALOG_AUDIT_OVERRIDE=1 node scripts/validate-catalog-manifest.mjs --update
```

Then commit `catalog-manifest.json` and `public/catalog.json` together, and
explain **why** in the commit message.

## What the override does not skip

- The empty-station guard in `process-catalog.mjs` (a station with zero videos
  always fails the build, override or not).
- The shipping gate that refuses to commit untagged videos.
- The source-health audit's invariant checks (duration bounds, 10K-view floor,
  unique IDs, source membership) — `CATALOG_AUDIT_OVERRIDE=1` reports these
  without failing, but they still indicate a real bug if present.

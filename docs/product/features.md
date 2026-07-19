---
title: Shipped Features
description: Inventory of shipped LoopTV features by area.
---

# Shipped Features

Source of truth for what the app does today. Derived from the product surface
and `PROJECT_STATUS.md` history; verify against code before relying on a
specific behavior.

## Core player

- Station grid landing; random video picker per station.
- YouTube IFrame API embed; auto-skip on embed errors 101/150
  (geo/copyright/owner disable). See
  [architecture/client-playback.md](../architecture/client-playback.md).
- Keyboard shortcuts: Space play/pause, N/P or arrows next/prev, M mute,
  F fullscreen, W hide-watched, `/` search, 1–9 station jump, Esc close search.
- Smart Mix preference weights in `localStorage`.

## Catalog & offline

- `/catalog.json` fetch with revalidation, retry, and backoff; offline fallback
  banner on landing with Retry (no full reload).
- Long-lived tabs revalidate the small catalog summary when they become active
  and fetch the full catalog only when a new deployment is detected.
- Sample channels visible from bundled `stations.json` when catalog unavailable.
- Dev hint for build-catalog when fetch fails in development.

## Playback diagnostics

- Compact banner when degraded: catalog age, source age, skip streaks, embed
  issue counts.
- Diagnostics can be dismissed for the current condition and return when a new
  issue appears.
- Retry refreshes catalog without full page reload.

## Source health & auto-pruning

- Channel Health panel: fresh/stale/partial/fallback/missing/embed/quarantined/
  blocked counts; issue filters; re-enable quarantined sources.
- Auto-quarantine on sustained embed failures; decisions persist in
  `localStorage`.

## Lean-back controls redesign

- Primary control rail: play/pause, next/previous, search, watch later, station
  switch.
- Secondary actions in More drawer; mobile-safe tap targets; keyboard shortcuts
  preserved.

## Client-side stats (`watched.ts`)

- `looptv_watched` — ≥50% viewed IDs.
- `looptv_stats` — per-station/source counts, total seconds.
- `looptv_blocked_sources`, `looptv_watch_later`, `looptv_smart_mix_profile`,
  `looptv_prefs`.
- Clearing site data wipes all; nothing leaves browser.

## Quality & maintenance

- Fork-friendly: edit `stations.json` and deploy.
- **Top-content policy:** global 10K-view minimum (requires full metadata);
  per-source duration filters; top-N% by views per channel plus a 200-video
  default cap (`scripts/catalog-quality.mjs`), configurable per source. SNL uses
  a reviewed 1,000-video cap because it occupies its own station. Catalog builds
  refuse output below threshold. Normal playback samples the full curated pool;
  Smart Mix retains ranked top-band selection.
- **Quota-aware refresh (2026-07-12):** 13-day cache gate, 250-video discovery
  ceiling, known-ID pagination stop, 50-ID metadata batches, 20-request
  per-source hard stop, per-shard request reporting, and no YouTube calls from
  build/deploy. Free-AI is called only when untagged videos exist. See
  [operations/jobs/fetch-catalog-sources.md](../operations/jobs/fetch-catalog-sources.md).
- **Full quality rebaseline (2026-07-12):** manual-only full upload-history scan
  with a 4,500-request global ceiling, 5 req/s throttle, per-source checkpoints,
  and zero-request resume. The verified 122-source baseline used 3,467 requests.
  See [operations/catalog-quality-audit.md](../operations/catalog-quality-audit.md).
- **Verified cache continuity (2026-07-12):** committed full-history catalog
  metadata reconstructs verified top-set checkpoints on fresh/legacy GitHub
  runners; source-row provenance controls the 13-day freshness gate, preventing
  checkout time from hiding stale data.
- **Catalog audit (2026-07-12, enhanced):** `catalog-manifest.json` baselines +
  `scripts/validate-catalog-manifest.mjs` hard-fail the Build Catalog workflow on
  suspicious swings. See
  [operations/catalog-auditability.md](../operations/catalog-auditability.md).
- **Catalog integrity (2026-07-12):** raw source caches are separated from
  checked-in fallback rows; tiny partial enrichments are rejected; catalog
  generation time is separate from last complete refresh; per-source provenance
  and 80% fresh-coverage gates prevent false-green refreshes;
  `scripts/audit-catalog-health.mjs` reports every configured channel grouped
  by station.

## Timeline

- **2026-04-04:** Initial launch (Create Next App default, Vercel implied).
- **2026-04-25 → 2026-04-28:** Deploy target migrated Vercel → Cloudflare
  Workers (OpenNext) → Cloudflare Pages (static export). See
  [archive/retros/2026-04-28-workers-to-pages.md](../archive/retros/2026-04-28-workers-to-pages.md).
- **2026-05-25:** React hydration error fix (fleet-smoke task done).
- **PRD cycle:** Playback diagnostics, source health auto-pruning, lean-back
  controls redesign — all shipped. See
  [archive/prds/](../archive/prds/).
- **2026-07-12:** Quota-aware YouTube Data API refresh path added; repository
  secrets synchronized from Infisical; yt-dlp retained as fallback. Full quality
  rebaseline + catalog integrity hardening landed the same day.
- **2026-07-17:** Owned-domain metadata and the `tv.significanthobbies.com`
  Cloudflare Pages target reverified for the current catalog build.
- **Bi-weekly CI:** Catalog rebuild may auto-commit on the 1st and 15th;
  maintainer review expected for station diffs.

---
title: PRD — Playback Diagnostics and Catalog Freshness
description: Shipped PRD for the degraded-playback diagnostics banner.
---

# PRD: Playback Diagnostics and Catalog Freshness

## Problem

LoopTV has basic fallback behavior for catalog load failures and embed errors, but the user only gets partial context when playback stutters, the catalog is old, or a station has too few healthy videos. Diagnostics are spread across hidden state and maintenance views.

## Goal

Give viewers and maintainers enough context to understand why playback is slow, stale, or skipping, without turning the UI into a debug console.

## Target User

- A viewer who wants the channel to keep feeling alive.
- A maintainer who needs to confirm whether a station issue is catalog age, source age, or embed blocking.

## Proposed Experience

1. A compact diagnostics banner appears only when playback quality is degraded.
2. The banner distinguishes between catalog freshness, source freshness, and embed failures.
3. A maintenance panel links the diagnosis to the affected station or source.
4. A retry action refreshes the catalog or summary without a full page reload.

## Scope

### In scope

- Make freshness and health signals easier to read in the player surface.
- Add lightweight diagnostics copy for catalog age, source age, and skip streaks.
- Expose a clear retry / refresh path for catalog summary and catalog fetches.
- Keep the existing offline fallback and sample-channel behavior.

### Out of scope

- Remote telemetry backends.
- Cloud dashboards.
- Any analytics schema change that requires a database.

## UX Requirements

- Keep the default player view clean when everything is healthy.
- Surface only one or two short lines of diagnosis at a time.
- Use plain language rather than internal codes unless a maintainer expands the panel.
- Make retry discoverable without forcing a page refresh.

## Functional Requirements

- Read catalog freshness from `lastUpdated`.
- Read source freshness from per-source fetch timestamps.
- Read embed health from local playback attempts.
- Derive a simple status label from the available signals.

## Acceptance Criteria

- When the catalog is stale, the user can see that fact without opening a separate page.
- When a source is failing embeds, the player explains that the issue is source-specific.
- Retry reloads the catalog state without a full navigation.
- Normal playback remains visually quiet when no issues are present.

## Risks

- Too much diagnosis could make the lean-back surface feel busy.
- Freshness labels can become noisy if they update too often.
- Retry logic can accidentally create duplicate in-flight fetches if it is not deduped.

## Success Metrics

- Fewer support questions about whether the catalog is broken or merely stale.
- Faster recovery from transient catalog fetch failures.
- Lower confusion around why a video was skipped.

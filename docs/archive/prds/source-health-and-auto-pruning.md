# PRD: Source Health Dashboard and Auto-Pruning

## Problem

LoopTV currently exposes source freshness and embed health in the UI, but the signal is informational only. Stale or broken sources still stay in rotation until a user notices them. That creates avoidable skips, dead-end stations, and catalog noise.

## Goal

Make source quality visible and actionable so LoopTV can surface healthy channels more often and quarantine bad sources without manual repo inspection.

## Target User

- A lean-back viewer who just wants playback to keep moving.
- A maintainer who adds channels to `stations.json` and wants fast feedback on whether the source is healthy.

## Proposed Experience

1. A health view shows every source with three states: fresh, stale, unhealthy embed rate, or blocked.
2. A source can be temporarily auto-quarantined when its embed failure rate crosses a threshold.
3. The app explains why a source is being downranked or hidden, with a single action to re-enable it.
4. The station grid and playback flow continue to work even when one or more sources are unhealthy.

## Scope

### In scope

- Expand `ChannelHealth` into a first-class maintenance panel.
- Add auto-prune / auto-quarantine rules based on source freshness and embed failures.
- Persist maintenance decisions in localStorage alongside existing watched and blocked state.
- Surface the active source state in the playback UI and station view.

### Out of scope

- Any server-side moderation workflow.
- Manual review queues or admin auth.
- Changes to catalog generation beyond metadata needed for the UI.

## UX Requirements

- Show counts for fresh, stale, unhealthy, and blocked sources.
- Allow filtering to issues only.
- Provide a single tap/click action to re-enable a quarantined source.
- Keep playback uninterrupted while the user inspects health.

## Functional Requirements

- Track stale sources using the existing catalog freshness metadata.
- Track embed health using sampled `onError` outcomes from playback.
- Hide or downrank sources only after the relevant threshold is crossed.
- Never permanently delete source config or catalog entries from the client.

## Acceptance Criteria

- A maintainer can open a health view and identify unhealthy sources in under 10 seconds.
- Sources with sustained embed failures are automatically excluded from random playback.
- Re-enabling a source immediately makes it eligible again.
- The app still plays from other sources when one source is quarantined.

## Risks

- Thresholds can be too aggressive and suppress good sources.
- Auto-pruning could hide useful content if the embed sample size is too small.
- Client-only persistence means the behavior is per-browser, not global.

## Success Metrics

- Fewer auto-skip events from repeated embed failures.
- Lower rate of user-visible dead-end station picks.
- Faster maintainer diagnosis of bad sources.

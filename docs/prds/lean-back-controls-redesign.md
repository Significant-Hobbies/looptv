# PRD: Lean-Back Controls Redesign

## Problem

LoopTV already supports keyboard shortcuts, watch later, queueing, and search, but the control surface is still a pile of power-user affordances. The app should feel like a TV on large screens and a usable remote-first surface on mobile.

## Goal

Rework the controls so the most common actions are obvious, reachable, and consistent across desktop, TV-sized displays, and mobile.

## Target User

- A couch user on a large screen.
- A mobile user who wants quick station changes and a reliable next-video action.
- A power user who still wants shortcuts, queueing, and search.

## Proposed Experience

1. The player exposes a small, stable control rail for play/pause, next, previous, search, watch later, and station switching.
2. Secondary actions move into drawers or overlays instead of competing for space in the main chrome.
3. Mobile layouts prioritize reachability over density.
4. Keyboard shortcuts stay intact and map to the same visible actions.

## Scope

### In scope

- Simplify the visible control hierarchy.
- Make primary actions easier to reach on mobile.
- Align watch later, queue, and station switching with the main playback flow.
- Keep existing shortcuts and overlays functional.

### Out of scope

- Rewriting the player engine.
- Adding account sync or multi-device persistence.
- Adding a complex customization system for controls.

## UX Requirements

- Primary controls must be visible within one glance on desktop and mobile.
- Buttons that open overlays should be visually distinct from actions that change playback immediately.
- The layout should remain usable on narrow screens and large 16:9 displays.
- There should be no hidden-only action that matters to basic playback.

## Functional Requirements

- Preserve keyboard shortcuts for existing actions.
- Preserve queue, watch later, and search behavior.
- Keep playback state transitions stable while the control surface changes.
- Keep the controls accessible with clear focus states and labels.

## Acceptance Criteria

- A new user can find next, search, and station switching without learning the shortcut sheet.
- Mobile users can reach the main playback actions without fighting overflow or cramped tap targets.
- Power users retain the same keyboard behavior they already use.
- The interface feels less cluttered without removing functionality.

## Risks

- Over-simplification could hide useful power features.
- Desktop and mobile variants can drift if they are not designed together.
- Control changes can accidentally break existing keyboard or overlay flows.

## Success Metrics

- Lower use of fallback navigation paths for basic actions.
- Better mobile interaction completion for search and station changes.
- Fewer accidental overlay opens or missed taps on smaller screens.

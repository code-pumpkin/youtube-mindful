---
date: 2026-10-23
type: pattern
status: active
tags: [desktop, navigation, responsive, usability]
---

# Use a contextual labelled desktop dock

## Context
The old left rail used small icon-only controls. Showing every destination with a label would make the interface crowded.

## Decision
Use a labelled bottom dock on pointer-based desktops. Show watch actions only on watch pages. Group Subscriptions, History, Watch Later, and Playlists under an anchored Library menu.

## Reasoning
Persistent labels improve discoverability. Contextual actions reduce clutter. Grouping secondary destinations keeps the main dock within one clear row.

## Consequences
Desktop content reserves space above the dock. Tablet keeps its labelled vertical rail. Phone keeps its separate bottom navigation implementation.

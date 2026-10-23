---
date: 2026-10-23
type: bugfix
status: active
tags: [desktop, details, youtube, viewmodel]
---

# Normalize Details instead of exposing native rows

## Context
The Details root stayed `display:none` after opening. YouTube's current description also contains hidden animated number rollers that became visible under broad descendant overrides.

## Decision
Restore the Details root and required ancestors only. Hide native metadata rows while open, then render title, stats, and attributed description text into controlled nodes.

## Reasoning
Broadly forcing YouTube descendants visible couples the design to undocumented internal animation markup. Text extraction gives the panel one stable internal model, matching the adapter pattern learned from Grayjay.

## Consequences
Selector changes remain isolated to extraction. The panel keeps a predictable layout and scrolls above the desktop dock.

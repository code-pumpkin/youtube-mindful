---
date: 2026-10-23
type: bugfix
status: active
tags: [desktop, comments, fullscreen, responsive, youtube]
---

# Keep watch routes within one viewport

## Context
Current YouTube places recommendations under `#related`, while the project only isolated legacy `#secondary`. The static related list added document height. YouTube's 10px root also reduced rem-based comment text below readable sizes.

## Decision
Track the active watch route with an HTML class. Lock watch layout to 100vh, support both related roots, use explicit rem values that resolve to 12–14px, and place fullscreen resets after dock breakpoints.

## Reasoning
Route state is more reliable than stale SPA elements. Ordered renderer fallbacks preserve phased YouTube rollouts. Late fullscreen rules prevent responsive dock reservations from winning the cascade.

## Consequences
Pointer-based desktop windows use the labelled dock above 700px. Normal watch pages do not document-scroll. Fullscreen removes all dock reservations.

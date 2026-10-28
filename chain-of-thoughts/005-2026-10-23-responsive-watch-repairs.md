# Repair responsive watch layouts

## Tools Called
- Playwright CLI: measured Comments fonts, document overflow, related roots, small-window layout, and fullscreen geometry.
- read/grep: mapped watch CSS, breakpoints, and current renderer structure.
- write/shell: added current renderer fallbacks, viewport rules, typography, and tests.

## Reasoning
YouTube's 10px root reduced comments to 7.5–8.125px. Its new `#related` root remained in normal flow and added 832px of scroll. Dock rules also followed fullscreen rules, so they overrode the fullscreen height reset.

## Outcome
Comments are 12.5–14px, watch pages stay at 100vh, fullscreen removes dock reservations, 900px desktop windows retain the dock, and video remains fully visible under YouTube-controlled internal sizing.

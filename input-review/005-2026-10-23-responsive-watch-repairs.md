# Responsive desktop watch repairs

## Your Input
Increase Comments readability. Remove extra watch-page scrolling. Restore full viewport use in fullscreen. Keep small desktop windows usable.

## AI Interpretation
Correct the root font-scale mismatch, isolate current related content from document flow, lock watch routes to one viewport, and apply the desktop dock above 700px for pointer input.

## Delta
Git history and live geometry showed that forcing current full-bleed internals shifted the video one full frame above its container. The fix restores YouTube-controlled internal sizing.

## Verdict
[ ] ✓ Aligned
[ ] ✗ Off — correction:

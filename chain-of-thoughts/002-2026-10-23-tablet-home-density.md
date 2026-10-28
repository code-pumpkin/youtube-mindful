# Repair tablet Home and desktop density

## Tools Called
- Playwright CLI: reproduced the rapid tablet Home failure and inspected current ViewModel cards.
- read/grep: found the global touch guard and legacy-only card selectors.
- write/shell: patched both desktop distributions and ran project checks.

## Reasoning
The touch guard blocked all second links within 400 ms, not only duplicate taps. YouTube's new ViewModel cards also bypassed the old spacing rules. The fix keeps old selectors and adds a scoped adapter for the new renderer.

## Outcome
Tablet Home navigation now survives the reproduced race, and Home cards use a spaced two/three-column layout.

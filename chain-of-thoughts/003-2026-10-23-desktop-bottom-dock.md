# Build the desktop bottom dock

## Tools Called
- read/grep: mapped sidebar, breakpoint, and navigation dependencies.
- write/shell: added the dock, Library menu, contextual actions, and responsive rules.
- Playwright CLI: verified Home, Library, and watch states against live YouTube.
- subagent: reviewed first-time discoverability and control density.

## Reasoning
Fourteen permanent controls would recreate the clutter problem. The dock keeps primary actions visible, hides watch actions off-watch, and groups secondary destinations under Library. The player height reserves dock space.

## Outcome
Desktop now has a labelled contextual dock, an anchored Library menu, and unobstructed watch controls.

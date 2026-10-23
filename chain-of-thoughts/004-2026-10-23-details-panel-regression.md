# Repair desktop Details panel

## Tools Called
- Playwright CLI: reproduced zero-size Details and inspected current metadata descendants.
- read/grep: traced panel CSS, panel state, and anti-backoff hooks.
- write/shell: restored the root display and replaced fragile native rows with normalized content.

## Reasoning
The open class landed, but the Details root remained `display:none`. Forcing YouTube's new hidden number rollers visible also produced a 1500px broken description. The stable fix extracts description text and renders one controlled panel.

## Outcome
Details opens with title, channel, stats, and scrollable description; playback defenses remain intact.

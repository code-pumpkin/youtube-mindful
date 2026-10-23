---
date: 2026-10-23
type: scope
status: active
tags: [mobile, responsive, playback, grayjay]
---

# Repair before restructure

## Context
YouTube changed its mobile components, and the existing phone interface now has layout defects. A redesign is also planned for phone, tablet, and desktop.

## Decision
Repair and verify the current phone implementation before extracting a new shared package structure.

## Reasoning
Live repair reveals YouTube's actual component contracts. Restructuring broken selectors would preserve unknown defects. Grayjay remains a reference for recovery patterns, but YouTube's native player remains responsible for playback.

## Consequences
Work starts on `feature/mobile-current-ui`. Visual redesign follows verified compatibility repairs. Playback-defense research remains in scope.

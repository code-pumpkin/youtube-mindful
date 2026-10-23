---
date: 2026-10-23
type: pattern
status: active
tags: [youtube, grayjay, renderers, navigation]
---

# Support renderer generations with fallbacks

## Context
YouTube migrated Home cards from `ytd-rich-grid-media` internals to ViewModel components. Tablet Home navigation also depended on one hidden native link.

## Decision
Keep legacy selectors while adding scoped ViewModel selectors. Use native navigation first and a full navigation fallback when the SPA route does not change.

## Reasoning
Grayjay remains resilient by supporting multiple response shapes and isolating fallbacks. Replacing old support would break users who receive a different YouTube rollout.

## Consequences
New YouTube migrations must add an adapter path instead of deleting the prior one. Navigation deduplication must compare destination identity, not only elapsed time.

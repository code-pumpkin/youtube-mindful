# Project overview

YouTube Mindful is a userscript and userstyle that makes YouTube calmer without reducing usability.

It supports three surfaces:
- Desktop on `www.youtube.com` with keyboard and pointer input.
- Tablet on `www.youtube.com` with touch-first responsive behavior.
- Phone on `m.youtube.com` with one-hand navigation and full-screen panels.

The first milestone repairs the phone UI against YouTube's current components. Later work redesigns each surface and extracts shared behavior.

YouTube keeps responsibility for playback. The project can study Grayjay's backoff and recovery techniques without copying its AGPL implementation or owning stream extraction.

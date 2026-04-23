# YouTube Player Loop / Fake Buffering — Troubleshooting Log

Date: 2026-04-23

## The Problem

YouTube's video player endlessly reinitializes — repeated `player?prettyPrint=false` POST requests with different `cpn` values, QoE requests blocked by uBlock Origin. Symptoms:
- Video not playing / stuck loading
- CC (captions) toggling on/off repeatedly
- Player creating new instances every second
- Works after full page refresh, but breaks on SPA navigation (clicking between videos)

## Root Cause

YouTube is A/B testing anti-adblock measures. Their SABR (Server Adaptive Bit Rate) protocol sends a server-side backoff of 80% of ad duration when ads are blocked. This causes fake buffering. Source: https://iter.ca/post/yt-adblock/

Additionally, uBlock Origin blocking `/api/stats/qoe` telemetry may cause YouTube's player to interpret blocked QoE as playback failure and retry.

## Things We Tried (all failed to fully fix it)

### 1. uBlock Origin filter updates
- Purged filter caches via Support > More > Purge all caches (button moved in uBO 1.55+)
- Updated all filter lists
- **Result**: No change

### 2. Manual uBlock filters — js(set) to strip ad data
```
www.youtube.com##+js(set, ytInitialPlayerResponse.playerAds, undefined)
www.youtube.com##+js(set, ytInitialPlayerResponse.adPlacements, undefined)
www.youtube.com##+js(set, ytInitialPlayerResponse.adSlots, undefined)
www.youtube.com##+js(set, playerResponse.adPlacements, undefined)
```
- These are already in uBlock's default filter list
- They strip ad placements from API responses but don't fix the SABR backoff
- **Result**: No change

### 3. Firefox HTML filter to strip locker script
```
www.youtube.com##^script#bc-def
```
- Firefox-only filter that strips YouTube's anti-tamper script from page source
- **Result**: No change

### 4. Enabled "uBlock filters – Experimental" filter list
- Dashboard > Filter lists > check "uBlock filters – Experimental"
- Contains heavy-duty anti-buffering script that detects stuck player and forces reload
- Uses `trusted-rpnt` to replace YouTube's `serverContract` function
- **Result**: No change

### 5. Object.assign proxy in userscript
- Hooked `Object.assign` to inject `"isInlinePlaybackNoAd":true` into player API requests
- Runs at `document-start`
- **Result**: May be getting overridden by YouTube's locker script

### 6. fetch proxy in userscript
- Hooked `window.fetch` to inject `"isInlinePlaybackNoAd":true`
- Both `fetch` and `Object.assign` hooked as backup for each other
- **Result**: No change — the backoff may be determined server-side before our hook runs

### 7. forceTheater JS (REMOVED — made things worse)
- Clicking `.ytp-size-button` to force theater mode
- Retry loops caused CSS layout thrash → player reinit loop
- Single click after 800ms was safest but still caused brief layout shift
- **REMOVED entirely** — CSS now handles player sizing without any JS player interaction

### 8. Full page reload on SPA navigation (REMOVED — too aggressive)
- `location.reload()` when navigating between watch pages
- Worked but annoying UX
- **REMOVED** in favor of fetch/Object.assign proxy approach

## Current State

- Both `fetch` and `Object.assign` proxies are in the userscript
- Script runs at `document-start`
- No JS player interaction at all (no theater clicks, no attribute setting)
- CSS handles all player sizing via `#player-container-outer`
- The fake buffering issue persists — likely server-side and not fully fixable client-side

## What Might Actually Fix It

1. **YouTube Premium** — no ads = no backoff (the "intended" solution)
2. **Wait for uBlock team** — they're actively working on it (uAssets issue #27415, #30157)
3. **Different account** — the A/B test is per-account, some accounts aren't affected
4. **Incognito/logged out** — may not be in the A/B test group
5. **ReVanced on Android** — patches the app directly, bypasses all of this
6. **NewPipe on Android** — no Google account, no ads, no buffering

## Mobile Flash Loop (SOLVED — 2026-04-23)

### Symptom
On `m.youtube.com`, the page flashes black repeatedly in an infinite loop.

### Root Causes (two issues stacked)

1. **Redirect loop in JS**: The script had `location.replace()` redirecting `m.youtube.com` → `www.youtube.com`. YouTube detected mobile user-agent and redirected back → infinite loop. **Fix**: Removed the redirect entirely.

2. **`display: none` on YouTube's header/nav**: The embedded mobile CSS in the JS file was hiding `ytm-mobile-topbar-renderer` and `ytm-pivot-bar-renderer` with `display: none`. YouTube's layout engine fights this aggressively on mobile, causing constant re-renders. **Fix**: Restyle with `background-color` instead of hiding.

### Key Lesson
On `m.youtube.com`, **never use `display: none` on core layout elements** (header, bottom nav). YouTube mobile re-creates them and the CSS/DOM fight causes a flash loop. Restyle them instead.

### Additional Notes
- The `NS_ERROR_ILLEGAL_VALUE` / `addSheet` errors in logcat are from Firefox's **built-in extensions** (ads@mozac.org etc.), NOT from our stylesheet
- `:has()` selector also breaks Firefox's `addSheet` API — avoid in `.user.css` files
- The `.user.css` file needs the `==UserStyle==` header and `.user.css` extension for Stylus to detect it
- The JS embeds its own copy of the mobile CSS — both must be kept in sync

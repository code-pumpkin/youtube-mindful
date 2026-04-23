# Fix YouTube Fake Buffering / Video Not Loading

YouTube is A/B testing anti-adblock measures that cause fake buffering when you use an adblocker. Videos get stuck loading on SPA navigation (clicking between videos) but work after a full page refresh.

---

## Firefox Desktop (uBlock Origin)

### Step 1: Update filter lists
1. Click the **uBlock Origin** icon → click the **gear icon** (opens dashboard)
2. Go to the **Support** tab
3. Click **"More"** in the Troubleshooting Information section
4. Click **"Purge all caches"** (top-right corner of that screen)
5. Go back to **Filter lists** tab → click **"Update now"**
6. Reload YouTube

### Step 2: Add these filters manually (easiest fix)
1. In uBlock dashboard → **My filters** tab
2. Paste ALL of these lines:
```
www.youtube.com##+js(set, ytInitialPlayerResponse.playerAds, undefined)
www.youtube.com##+js(set, ytInitialPlayerResponse.adPlacements, undefined)
www.youtube.com##+js(set, ytInitialPlayerResponse.adSlots, undefined)
www.youtube.com##+js(set, playerResponse.adPlacements, undefined)
www.youtube.com##^script#bc-def
```
3. Click **Apply changes**
4. Reload YouTube

---

## Android (Firefox + uBlock Origin)

Firefox on Android supports uBlock Origin — same steps as desktop:

1. Install **Firefox** from Play Store (not Chrome — Chrome doesn't support extensions on Android)
2. Install **uBlock Origin** from Firefox Add-ons
3. Open uBlock settings → Filter lists → Purge all caches → Update now
4. If needed, add the manual filter from Step 2 above

---

## Android (without Firefox — using ReVanced)

If you use the YouTube app on Android:

1. Install **ReVanced Manager** from [revanced.app](https://revanced.app)
2. Patch the YouTube APK with these patches enabled:
   - **Remove ads** 
   - **SponsorBlock**
   - **Return YouTube Dislike**
3. Install the patched APK
4. ReVanced bypasses all ad-related buffering since it patches the app directly

---

## Android (NewPipe — no Google account needed)

1. Install **NewPipe** from [newpipe.net](https://newpipe.net) or F-Droid
2. No ads, no buffering, no Google account required
3. Downside: no recommendations, no comments, no account sync

---

## Chrome / Chromium Desktop

Chrome has limited extension support. uBlock Origin Lite (MV3) may not support the `trusted-replace-outbound-text` filter.

Options:
1. **Switch to Firefox** — full uBlock Origin support
2. **Use uBlock Origin Lite** and hope the default filters cover it
3. **Install Tampermonkey** and add this userscript manually:

```js
// ==UserScript==
// @name         YouTube Anti-Backoff
// @match        https://www.youtube.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==
(function() {
    const orig = JSON.stringify;
    JSON.stringify = function() {
        let result = orig.apply(this, arguments);
        if (typeof result === 'string' && result.includes('"contentPlaybackContext":{')) {
            result = result.replace(
                '"contentPlaybackContext":{',
                '"contentPlaybackContext":{"isInlinePlaybackNoAd":true,'
            );
        }
        return result;
    };
})();
```

---

## Why this happens

YouTube's SABR (Server Adaptive Bit Rate) protocol supports server-side backoffs. When YouTube detects ad blocking, it tells the video stream server to delay sending video data for 80% of the ad duration. This causes the "buffering" you see. It's not real buffering — it's an intentional delay.

The fix works by telling YouTube's API that the playback context doesn't need ads (`isInlinePlaybackNoAd: true`), so no backoff is added to the stream.

Source: https://iter.ca/post/yt-adblock/

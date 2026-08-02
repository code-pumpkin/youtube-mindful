# YouTube Mindful

A userscript + userstyle combo that replaces YouTube's default UI with a clean, minimal, distraction-free interface. Separate implementations for desktop and mobile.

**Desktop** (`www.youtube.com`) — sidebar nav, right-docked panels, keyboard shortcuts, warm dark theme.

**Mobile** (`m.youtube.com`) — bottom bar nav, fullscreen panels, background playback, no shorts/ads.

---

## Features

### Shared
- Warm dark theme, WCAG AA contrast throughout (every text token verified ≥ 4.5:1)
- Sans-serif for reading, monospace reserved for numbers and timestamps
- Softened corners (`0.375rem`), 1px borders, no stacked shadows
- Calm density — 3 columns on desktop instead of 6, generous gaps
- Panel prewarming: comments and recommendations load in the background, so opening is instant
- `prefers-reduced-motion` respected; visible focus rings everywhere
- No shorts, ads, community posts, or promoted content
- Anti-backoff hooks (prevents YouTube's fake buffering when using adblockers)
- Background playback (video keeps playing when switching tabs/apps)

### Desktop
- Sidebar with SVG icons (Home, Search, Subs, History, Settings)
- Right-docked panels for Comments, Recommendations, Details, Live Chat
- Panel system uses pure CSS via body classes — no DOM reparenting
- Prewarm indicator: a small dot marks panels whose content is already loaded
- Configurable keybindings and panel width; prewarming can be turned off
- Responsive: 3 columns → 4 above 1600px → 1 below 700px
- Full-width theater mode player

### Mobile
- Bottom bar with 5 buttons (Home, Search, Back, Subs, History)
- 44px minimum touch targets, safe-area insets honoured on notched devices
- Watch page: video → title → channel → comments teaser → action buttons
- Details/Related panels open fullscreen via body classes
- Comments use YouTube's native engagement panel (loads properly)
- Video keeps playing while reading comments
- Search overlay with live autocomplete

---

## Installation

### Desktop

| Tool | Purpose |
|---|---|
| [Stylus](https://github.com/openstyles/stylus) | Injects the CSS |
| [Violentmonkey](https://violentmonkey.github.io/) / [Tampermonkey](https://www.tampermonkey.net/) | Runs the JS |

1. Install Stylus → open dashboard → new style → paste `desktop/youtube-mindful.user.css` → save
2. Install Violentmonkey → open dashboard → new script → paste `desktop/youtube-mindful.user.js` → save
3. Reload YouTube

### Mobile (Firefox Android)

| Tool | Purpose |
|---|---|
| [Tampermonkey](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) | Runs the JS (CSS embedded) |

1. Install Firefox on Android
2. Install Tampermonkey extension
3. Open Tampermonkey dashboard → new script → paste `mobile/youtube-mindful-mobile.user.js` → save
4. Navigate to `m.youtube.com`

> The mobile script embeds its own CSS. A standalone `.user.css` is also provided for Stylus if needed.

---

## File Structure

```
desktop/
  youtube-mindful.user.js       # Desktop userscript
  youtube-mindful.user.css      # Desktop userstyle

mobile/
  youtube-mindful-mobile.user.js    # Mobile userscript (CSS embedded)
  youtube-mindful-mobile.user.css   # Mobile userstyle (standalone)

tools/
  sync-css.py         # Copies .user.css into the .user.js template string
  verify-design.py    # Contrast ratios, token usage, warm/open pairing
  test-prewarm.js     # Functional test of the prewarm state machine
```

> The `.user.css` file is the source of truth. Each `.user.js` embeds a copy so
> it works without Stylus. **After editing any CSS, run `python3 tools/sync-css.py`**
> or the two copies will drift.

---

## Design System

All colors are CSS variables. Contrast is verified against every surface the
text can land on — run `python3 tools/verify-design.py` to check.

| Token | Value | Contrast on `--bg` |
|---|---|---|
| `--fg` | `#eae5dc` | 15.0:1 |
| `--fg-muted` | `#a39d94` | 7.0:1 |
| `--fg-subtle` | `#8e8981` | 5.4:1 |
| `--accent` | `#b8a98f` | 8.2:1 |

Surfaces are limited to three shades (`--bg` → `--surface` → `--surface-2`).
Type uses four sizes (`0.75` / `0.8125` / `0.9375` / `1.0625rem`); hierarchy
comes from weight and color, not size. Spacing follows a `0.25rem` grid.
Status colors (`--success`, `--warning`, `--danger`, `--info`) signal state
only — they are never used for categorization.

---

## Panel Prewarming

YouTube lazy-loads comments and recommendations behind an
`IntersectionObserver`. The closed state parks those elements offscreen
(`left: -200vw`, `visibility: hidden`), so the observer never fires and the
fetch only starts when you click. That is the lag.

The fix is a third state between closed and open:

| State | Geometry | Visible | Interactive |
|---|---|---|---|
| **cold** | offscreen, zero-size | no | no |
| **warm** | real position and size | no (`opacity: 0`, `z-index: -1`) | no (`inert`) |
| **open** | real position and size | yes | yes |

In the warm state the observer fires and content loads, but nothing is
visible. Opening afterwards is just an opacity flip.

Two details matter:

- Interaction is blocked with the `inert` attribute, not `visibility: hidden`
  — the latter suppresses `loading="lazy"` images and would defeat the purpose.
- Warming is staggered (details 0.9s, recs 1.6s, comments 2.4s) so three
  fetches don't compete with the player's own startup.

Live chat is deliberately excluded: its iframe streams messages as soon as it
mounts. Clicking a panel before its timer fires warms it on demand first, so
there is no penalty for being quick.

Toggle it off under Settings → Preload panels.

---

## Development

```bash
python3 tools/sync-css.py       # after any CSS edit — keeps .js copy in sync
python3 tools/verify-design.py  # contrast, tokens, state pairing
node tools/test-prewarm.js      # prewarm state machine
node --check desktop/youtube-mindful.user.js
```

---

## How It Works

Both desktop and mobile use the same core approach:

1. **CSS hides unwanted elements** — shorts, ads, chips, promoted content
2. **CSS repositions YouTube's own elements** for panels — no cloning, no innerHTML, no DOM manipulation
3. **JS toggles body classes** — `body.mindful-panel-comments` etc. — CSS does all the positioning
4. **JS adds a warm class** ahead of time so YouTube prefetches panel content (see above)
5. **JS handles search overlay** with live autocomplete from YouTube's suggestion API
6. **JS hooks `fetch`** to inject `isInlinePlaybackNoAd: true` into player API requests (anti-backoff)
7. **JS spoofs Page Visibility API** for background playback

---

## Credits

This project is a continuation of [nvim-style-youtube-ui](https://github.com/code-pumpkin/nvim-style-youtube-ui), which was a NeoVim-inspired YouTube interface with Ayu Dark color scheme and Vim-style keybindings.

Portions of the original userstyle were inspired by or adapted from:

- [Roundless YouTube](https://userstyles.world/style/26523/roundless-youtube) by imluciddreaming — border-radius removal
- [Clean YouTube](https://userstyles.world/style/10175/clean-youtube) by 0ko ([source](https://codeberg.org/0ko/UserStyles)) — Shorts hiding selectors (MIT)
- [AdashimaaTube](https://userstyles.world/style/6944/old-youtube-layout-in-2021-2022) by sapondanaisriwan ([source](https://github.com/sapondanaisriwan/AdashimaaTube)) — grid layout approach (MIT)

Anti-backoff technique based on research by [iter.ca](https://iter.ca/post/yt-adblock/) on YouTube's SABR protocol.

---

## License

[MIT](LICENSE)

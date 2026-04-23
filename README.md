# YouTube Mindful

A userscript + userstyle combo that replaces YouTube's default UI with a clean, minimal, distraction-free interface. Separate implementations for desktop and mobile.

**Desktop** (`www.youtube.com`) — sidebar nav, right-docked panels, keyboard shortcuts, dark monospace theme.

**Mobile** (`m.youtube.com`) — bottom bar nav, fullscreen panels, background playback, no shorts/ads.

---

## Features

### Shared
- Dark monospace theme with warm tones
- No shorts, ads, community posts, or promoted content
- No border-radius anywhere
- Anti-backoff hooks (prevents YouTube's fake buffering when using adblockers)
- Background playback (video keeps playing when switching tabs/apps)

### Desktop
- Sidebar with SVG icons (Home, Search, Subs, History, Settings)
- Right-docked panels for Comments, Recommendations, Details, Live Chat
- Panel system uses pure CSS via body classes — no DOM reparenting
- Keyboard shortcuts (leader key, Vim-style navigation)
- Responsive: phone breakpoint switches to overlay panels
- Full-width theater mode player

### Mobile
- Bottom bar with 5 buttons (Home, Search, Back, Subs, History)
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
```

---

## How It Works

Both desktop and mobile use the same core approach:

1. **CSS hides unwanted elements** — shorts, ads, chips, promoted content
2. **CSS repositions YouTube's own elements** for panels — no cloning, no innerHTML, no DOM manipulation
3. **JS toggles body classes** — `body.mindful-panel-comments` etc. — CSS does all the positioning
4. **JS handles search overlay** with live autocomplete from YouTube's suggestion API
5. **JS hooks `fetch`** to inject `isInlinePlaybackNoAd: true` into player API requests (anti-backoff)
6. **JS spoofs Page Visibility API** for background playback

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

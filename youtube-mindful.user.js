// ==UserScript==
// @name         YouTube Mindful v8
// @namespace    youtube-mindful
// @version      8.1.0
// @description  Mindful YouTube — sidebar nav, side panels, responsive.
// @author       codePumpkin
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @match        https://music.youtube.com/*
// @grant        GM_xmlhttpRequest
// @connect      suggestqueries-clients6.youtube.com
// @connect      *
// @run-at       document-start
// ==/UserScript==

(function () {
    "use strict";

    const C = {
        bgDark:"#0a0a0a", bgFloat:"#181818", border:"#2a2a2a", bgHover:"#252525",
        fg:"#e8e2d6", fgDim:"#8a8a8a", fgDark:"#4a4a4a",
        accent:"#c8c0b0", green:"#8fbe7a", cyan:"#90b0c8", magenta:"#b8a0d0",
        yellow:"#d4c090",
    };

    const PANELS = ["details","recs","comments","chat"];
    const panelClasses = {
        details:"mindful-panel-details", recs:"mindful-panel-recs",
        comments:"mindful-panel-comments", chat:"mindful-panel-chat",
    };

    let state = { panelOpen: null };

    const MINDFUL_CSS = `
:root {
    --bg:       #101010;  --bg-dark:  #0a0a0a;  --bg-float: #181818;
    --bg-hover: #252525;  --bg-sel:   #2a2a2a;
    --fg:       #e8e2d6;  --fg-dim:   #8a8a8a;  --fg-dark:  #4a4a4a;
    --border:   #2a2a2a;
    --accent:   #c8c0b0;  --green:    #8fbe7a;  --red:      #c75050;
    --yellow:   #d4c090;  --cyan:     #90b0c8;  --magenta:  #b8a0d0;
    --sidebar-w: 48px;
    --mindful-panel-w: 380px;
    --mono:     "JetBrains Mono","Fira Code","Cascadia Code",monospace;
}

/* ── GLOBAL ── */
html, body, ytd-app, #content, ytd-browse, ytd-search,
ytd-watch-flexy, ytd-page-manager, ytd-two-column-browse-results-renderer,
ytd-rich-grid-renderer, #page-manager, tp-yt-app-drawer {
    background-color: var(--bg) !important; color: var(--fg) !important;
}
html[dark] {
    --yt-spec-base-background: var(--bg) !important;
    --yt-spec-raised-background: var(--bg) !important;
    --yt-spec-menu-background: var(--bg-float) !important;
    --yt-spec-general-background-a: var(--bg) !important;
    --yt-spec-general-background-b: var(--bg) !important;
    --yt-spec-general-background-c: var(--bg) !important;
    --yt-spec-brand-background-solid: var(--bg) !important;
    --yt-spec-text-primary: var(--fg) !important;
    --yt-spec-text-secondary: var(--fg-dim) !important;
    --yt-spec-badge-chip-background: var(--bg-sel) !important;
    --yt-spec-10-percent-layer: var(--bg-hover) !important;
}

/* ── NUKE MASTHEAD + YT SIDEBAR + CHIPS ── */
#masthead-container, ytd-masthead, #masthead { display: none !important; }
ytd-app { --ytd-masthead-height: 0px !important; margin-top: 0 !important; }
#page-manager { margin-top: 0 !important; }
tp-yt-app-drawer, #guide, #guide-button, ytd-mini-guide-renderer,
#guide-inner-content, app-drawer, tp-yt-app-drawer[opened], #guide-wrapper {
    display: none !important; width: 0 !important;
}
ytd-page-manager { margin-left: var(--sidebar-w) !important; }
ytd-app[guide-persistent-and-visible] #page-manager.ytd-app { margin-left: var(--sidebar-w) !important; }
ytd-feed-filter-chip-bar-renderer, #chips-wrapper,
#header-bar ytd-feed-filter-chip-bar-renderer,
ytd-browse yt-chip-cloud-renderer, ytd-search yt-chip-cloud-renderer,
#header.ytd-rich-grid-renderer, ytd-rich-grid-renderer > #header,
#immersive-header-container, ytd-browse[page-subtype="home"] #header,
ytd-browse #header.ytd-browse, #frosted-glass { display: none !important; }
ytd-browse[page-subtype="home"] *, ytd-search * {
    backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
}

/* ── HOME GRID — 4 cols tablet default ── */
ytd-rich-grid-renderer {
    --ytd-rich-grid-items-per-row: 4 !important;
    --ytd-rich-grid-posts-per-row: 4 !important;
    --ytd-rich-grid-slim-items-per-row: 4 !important;
    max-width: 100% !important; width: 100% !important; padding: 8px !important;
}
ytd-rich-grid-renderer #contents.ytd-rich-grid-renderer { padding: 0 4px !important; }
ytd-rich-grid-row { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
ytd-rich-grid-row #contents.ytd-rich-grid-row { display: flex !important; flex-wrap: wrap !important; gap: 6px !important; }
ytd-rich-item-renderer {
    width: calc(25% - 8px) !important; max-width: calc(25% - 8px) !important;
    min-width: 0 !important; margin: 4px 0 !important; padding: 0 4px 8px 4px !important;
}
ytd-rich-item-renderer ytd-thumbnail, ytd-thumbnail img { border-radius: 0 !important; }
#video-title-link, #video-title {
    font-size: 12px !important; line-height: 1.3 !important;
    font-family: var(--mono) !important; color: var(--fg) !important;
    -webkit-line-clamp: 2 !important; max-height: 2.6em !important; overflow: hidden !important;
}
ytd-channel-name, #channel-name, .ytd-channel-name a, #text.ytd-channel-name {
    font-size: 11px !important; font-family: var(--mono) !important; color: var(--fg-dim) !important;
}
#metadata-line, .ytd-video-meta-block, #metadata-line span {
    font-size: 10px !important; font-family: var(--mono) !important; color: var(--fg-dark) !important;
}
ytd-rich-item-renderer #avatar-link,
ytd-rich-item-renderer ytd-channel-thumbnail-with-link-renderer { display: none !important; }
#details.ytd-rich-grid-media, #meta.ytd-rich-grid-media { padding: 4px 2px !important; margin: 0 !important; }
ytd-rich-item-renderer:hover { outline: 1px solid var(--accent) !important; outline-offset: -1px; }

/* ── NO BORDER RADIUS ── */
*, *::after, *::before { border-radius: 0 !important; }
.ytp-scrubber-button, .ytp-volume-slider-handle, .ytp-spinner-circle { border-radius: 50% !important; }

/* ── HIDE SHORTS + JUNK ── */
ytd-rich-section-renderer, ytd-reel-shelf-renderer, [is-shorts],
ytd-rich-shelf-renderer[is-shorts],
ytd-mini-guide-entry-renderer[aria-label="Shorts"],
ytd-guide-entry-renderer:has(a[title="Shorts"]),
ytd-search ytd-reel-shelf-renderer,
ytd-search ytd-video-renderer:has([overlay-style="SHORTS"]),
ytd-search ytd-video-renderer:has(a[href*="/shorts/"]),
a[href*="/shorts/"],
ytd-grid-video-renderer:has(a[href*="/shorts/"]),
ytd-video-renderer:has(a[href*="/shorts/"]),
ytd-compact-video-renderer:has(a[href*="/shorts/"]),
yt-tab-shape[tab-title="Shorts"],
ytd-post-renderer, ytd-backstage-post-thread-renderer,
ytd-rich-shelf-renderer, ytd-compact-video-renderer[is-shorts],
ytd-movie-offering-module-renderer, ytd-compact-movie-renderer,
ytd-merch-shelf-renderer, ytd-ticket-shelf-renderer { display: none !important; }

/* ── SEARCH PAGE ── */
ytd-search #page-manager, ytd-search ytd-two-column-search-results-renderer,
ytd-search ytd-section-list-renderer {
    max-width: 100% !important; width: 100% !important; padding: 0 !important; margin: 0 !important;
}
ytd-search ytd-section-list-renderer #contents { max-width: 100% !important; padding: 8px !important; }
ytd-search ytd-item-section-renderer #contents {
    display: grid !important; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)) !important;
    gap: 12px !important; max-width: 100% !important; align-items: start !important;
}
ytd-search ytd-video-renderer {
    display: flex !important; flex-direction: column !important;
    width: 100% !important; max-width: 100% !important; min-width: 0 !important;
    padding: 0 !important; margin: 0 !important; background: var(--bg) !important; overflow: hidden !important;
}
ytd-search ytd-video-renderer #dismissible { display: flex !important; flex-direction: column !important; width: 100% !important; }
ytd-search ytd-video-renderer ytd-thumbnail { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
ytd-search ytd-video-renderer ytd-thumbnail img { width: 100% !important; height: auto !important; aspect-ratio: 16/9 !important; object-fit: cover !important; }
ytd-search ytd-video-renderer .text-wrapper { display: flex !important; flex-direction: column !important; width: 100% !important; padding: 6px 4px !important; }
ytd-search ytd-video-renderer #channel-thumbnail,
ytd-search ytd-video-renderer #avatar-link { display: none !important; }
ytd-search ytd-secondary-search-container-renderer,
ytd-search #secondary.ytd-two-column-search-results-renderer { display: none !important; }
ytd-search ytd-video-renderer #video-title, ytd-search ytd-video-renderer h3.title-and-badge {
    font-size: 12px !important; font-family: var(--mono) !important; color: var(--fg) !important;
    -webkit-line-clamp: 2 !important; overflow: hidden !important; line-height: 1.4 !important;
}
ytd-search ytd-video-renderer ytd-channel-name { font-size: 10px !important; font-family: var(--mono) !important; color: var(--fg-dim) !important; }
ytd-search ytd-promoted-sparkles-web-renderer, ytd-search ytd-shelf-renderer,
ytd-search ytd-ad-slot-renderer, ytd-search ytd-promoted-video-renderer { display: none !important; }
ytd-search ytd-video-renderer:hover { outline: 1px solid var(--accent) !important; outline-offset: -1px; }

/* ── WATCH PAGE ── */
ytd-watch-flexy {
    --ytd-watch-flexy-panel-max-width: 100% !important;
    max-width: 100% !important; padding: 0 !important;
}
ytd-watch-flexy #columns.ytd-watch-flexy,
ytd-watch-flexy #primary.ytd-watch-flexy,
ytd-watch-flexy #primary-inner.ytd-watch-flexy {
    max-width: 100% !important; width: 100% !important; padding: 0 !important;
}
/* Player fills viewport — no JS theater click needed */
ytd-watch-flexy #player-wide-container.ytd-watch-flexy,
ytd-watch-flexy #player-theater-container.ytd-watch-flexy,
ytd-watch-flexy #player-container-outer.ytd-watch-flexy {
    height: 100vh !important; max-height: 100vh !important;
    max-width: 100% !important;
}
ytd-watch-flexy[full-bleed-player] #full-bleed-container.ytd-watch-flexy { max-height: 100vh !important; }
#movie_player { max-height: 100vh !important; }

/* Hide below-player, secondary, comments, chat by default */
ytd-watch-flexy #below {
    padding: 0 !important; margin: 0 !important; max-width: 100% !important;
    height: 0 !important; overflow: hidden !important;
}
ytd-watch-flexy #above-the-fold, ytd-watch-flexy ytd-watch-metadata,
ytd-watch-flexy #top-row, ytd-watch-flexy #bottom-row,
ytd-watch-flexy #description, ytd-watch-flexy #description-inner,
ytd-watch-flexy ytd-text-inline-expander, ytd-watch-flexy #snippet,
ytd-watch-flexy #plain-snippet-text { display: none !important; }

ytd-watch-flexy #comments, ytd-watch-flexy ytd-comments#comments {
    position: fixed !important; left: -200vw !important;
    visibility: hidden !important; pointer-events: none !important;
}
ytd-watch-flexy #secondary, ytd-watch-flexy #secondary-inner,
ytd-watch-flexy ytd-watch-next-secondary-results-renderer {
    position: fixed !important; left: -200vw !important;
    width: 0 !important; height: 0 !important; overflow: hidden !important;
    visibility: hidden !important; pointer-events: none !important;
    clip: rect(0,0,0,0) !important; clip-path: inset(50%) !important; opacity: 0 !important;
}
ytd-watch-flexy ytd-live-chat-frame#chat {
    position: fixed !important; left: -200vw !important;
    visibility: hidden !important; pointer-events: none !important;
}

/* ── PANELS — right-docked, pure CSS via body classes ── */
/* Shared: all panels dock to right side */
body.mindful-panel-comments ytd-watch-flexy #comments,
body.mindful-panel-comments ytd-watch-flexy ytd-comments#comments,
body.mindful-panel-recs ytd-watch-flexy #secondary,
body.mindful-panel-details ytd-watch-flexy #above-the-fold,
body.mindful-panel-chat ytd-watch-flexy ytd-live-chat-frame#chat {
    position: fixed !important;
    top: 0 !important; right: 0 !important; bottom: 0 !important;
    left: auto !important;
    width: var(--mindful-panel-w) !important; height: 100vh !important; max-height: 100vh !important;
    overflow-y: auto !important; overflow-x: hidden !important;
    background: var(--bg-float) !important;
    padding: 16px !important;
    z-index: 90000 !important;
    visibility: visible !important; pointer-events: auto !important;
    animation: panel-slide 0.18s ease !important;
    transform: none !important;
}
@keyframes panel-slide {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0); opacity: 1; }
}

/* Border colors per panel */
body.mindful-panel-comments ytd-watch-flexy #comments,
body.mindful-panel-comments ytd-watch-flexy ytd-comments#comments {
    border-left: 3px solid var(--magenta) !important;
}
body.mindful-panel-recs ytd-watch-flexy #secondary {
    border-left: 3px solid var(--cyan) !important;
}
body.mindful-panel-details ytd-watch-flexy #above-the-fold {
    border-left: 3px solid var(--accent) !important;
}
body.mindful-panel-chat ytd-watch-flexy ytd-live-chat-frame#chat {
    border-left: 3px solid var(--fg-dim) !important; padding: 0 !important;
}

/* Recs inner fix */
body.mindful-panel-recs ytd-watch-flexy #secondary {
    top: 0 !important; right: 0 !important;
    visibility: visible !important; pointer-events: auto !important;
    width: var(--mindful-panel-w) !important; height: 100vh !important;
    clip: auto !important; clip-path: none !important; opacity: 1 !important;
    overflow-y: auto !important;
}
body.mindful-panel-recs ytd-watch-flexy #secondary-inner,
body.mindful-panel-recs ytd-watch-flexy ytd-watch-next-secondary-results-renderer {
    position: static !important; width: auto !important; height: auto !important;
    overflow: visible !important; clip: auto !important; clip-path: none !important;
    opacity: 1 !important; visibility: visible !important; pointer-events: auto !important;
}
body.mindful-panel-recs ytd-watch-flexy #secondary-inner { max-width: 100% !important; width: 100% !important; }

/* Details panel — same v6 approach */
body.mindful-panel-details ytd-watch-flexy #below { height: auto !important; overflow: visible !important; }
body.mindful-panel-details ytd-watch-flexy ytd-watch-metadata,
body.mindful-panel-details ytd-watch-flexy #top-row,
body.mindful-panel-details ytd-watch-flexy #bottom-row,
body.mindful-panel-details ytd-watch-flexy #description,
body.mindful-panel-details ytd-watch-flexy ytd-watch-metadata #description,
body.mindful-panel-details ytd-watch-flexy #description-inner,
body.mindful-panel-details ytd-watch-flexy ytd-text-inline-expander,
body.mindful-panel-details ytd-watch-flexy #snippet,
body.mindful-panel-details ytd-watch-flexy #plain-snippet-text,
body.mindful-panel-details ytd-watch-flexy ytd-structured-description-content-renderer,
body.mindful-panel-details ytd-watch-flexy #attributed-snippet-text,
body.mindful-panel-details ytd-watch-flexy ytd-text-inline-expander #content,
body.mindful-panel-details ytd-watch-flexy ytd-text-inline-expander .content {
    display: block !important; visibility: visible !important;
    pointer-events: auto !important; position: static !important;
    left: auto !important; top: auto !important;
}
body.mindful-panel-details ytd-watch-flexy #above-the-fold {
    display: block !important; visibility: visible !important; pointer-events: auto !important;
    font-family: var(--mono) !important; font-size: 12px !important; color: var(--fg) !important;
}
body.mindful-panel-details ytd-watch-flexy #top-row { display: flex !important; flex-wrap: wrap !important; }
body.mindful-panel-details ytd-watch-flexy #bottom-row { display: block !important; }
body.mindful-panel-details ytd-watch-flexy #bottom-row > *:not(#description) { display: none !important; }
body.mindful-panel-details ytd-watch-flexy ytd-text-inline-expander,
body.mindful-panel-details ytd-watch-flexy ytd-structured-description-content-renderer,
body.mindful-panel-details ytd-watch-flexy #description-inner,
body.mindful-panel-details ytd-watch-flexy #description {
    max-height: none !important; overflow: visible !important; display: block !important; height: auto !important;
}
body.mindful-panel-details ytd-watch-flexy #expand,
body.mindful-panel-details ytd-watch-flexy #collapse,
body.mindful-panel-details ytd-watch-flexy [slot="expand-button"],
body.mindful-panel-details ytd-watch-flexy [slot="collapse-button"] { display: none !important; }

/* Chat iframe fill */
body.mindful-panel-chat ytd-watch-flexy ytd-live-chat-frame#chat iframe {
    width: 100% !important; height: 100% !important;
}

/* Stats injected by JS */
#mindful-stats {
    display: flex !important; gap: 12px !important; flex-wrap: wrap !important;
    padding: 0 0 10px 0 !important; margin-bottom: 10px !important;
    border-bottom: 1px solid var(--border) !important;
    font-family: var(--mono) !important; font-size: 11px !important;
}
#mindful-title-inject {
    margin-bottom: 10px !important; padding-bottom: 10px !important;
    border-bottom: 1px solid var(--border) !important;
}

/* ── SIDEBAR ── */
#mindful-sidebar {
    position: fixed; top: 0; left: 0; bottom: 0;
    width: var(--sidebar-w); background: var(--bg-dark);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column; align-items: center;
    padding: 8px 0; gap: 2px; z-index: 99999;
    font-family: var(--mono); overflow-y: auto; overflow-x: hidden;
}
#mindful-sidebar button {
    width: 40px; height: 40px; border: none; background: transparent;
    color: var(--fg-dim); font-size: 18px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.12s, color 0.12s; position: relative;
}
#mindful-sidebar button svg { pointer-events: none; }
#mindful-sidebar button:hover { background: var(--bg-hover) !important; color: var(--fg) !important; }
#mindful-sidebar button.active { color: var(--accent) !important; background: var(--bg-sel) !important; }
#mindful-sidebar button[disabled] { opacity: 0.15 !important; pointer-events: none !important; }
#mindful-sidebar .sep { width: 28px; height: 1px; background: var(--border); margin: 4px 0; }
#mindful-sidebar button::after {
    content: attr(aria-label); position: absolute; left: 52px; top: 50%;
    transform: translateY(-50%); background: var(--bg-float); color: var(--fg);
    font-size: 10px; padding: 3px 8px; border: 1px solid var(--border);
    white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity 0.15s; z-index: 100000;
}
#mindful-sidebar button:hover::after { opacity: 1; }

/* ── SEARCH OVERLAY ── */
#mindful-search {
    position: fixed; inset: 0; background: rgba(0,0,0,0.88);
    z-index: 100001; display: none; align-items: flex-start;
    justify-content: center; padding-top: 22vh;
}
#mindful-search.open { display: flex !important; }
#mindful-search input {
    width: 55%; max-width: 600px; background: var(--bg-float);
    border: none; border-bottom: 2px solid var(--accent);
    color: var(--fg); font-family: var(--mono); font-size: 18px;
    padding: 10px 4px; outline: none;
}
#mindful-search input::placeholder { color: var(--fg-dark); }
#mindful-suggest {
    width: 55%; max-width: 600px; background: var(--bg-dark);
    max-height: 40vh; overflow-y: auto; display: none;
    border: 1px solid var(--border); border-top: none;
}
#mindful-suggest .item {
    padding: 8px 12px; cursor: pointer; font-family: var(--mono);
    font-size: 13px; color: var(--fg); border-bottom: 1px solid var(--border);
}
#mindful-suggest .item:hover, #mindful-suggest .item.sel { background: var(--bg-hover); }

/* ── SCROLLBAR ── */
::-webkit-scrollbar { width: 5px !important; height: 5px !important; }
::-webkit-scrollbar-track { background: var(--bg-dark) !important; }
::-webkit-scrollbar-thumb { background: var(--fg-dark) !important; }
::-webkit-scrollbar-thumb:hover { background: var(--fg-dim) !important; }

/* ── MISC ── */
ytd-notification-topbar-button-renderer, #voice-search-button { display: none !important; }
tp-yt-paper-dialog, ytd-popup-container, ytd-menu-popup-renderer {
    background: var(--bg-float) !important; color: var(--fg) !important;
    border: 1px solid var(--border) !important;
}
a, a:visited { color: var(--fg) !important; }
a:hover { color: var(--accent) !important; }

/* ── CHANNEL PAGES ── */
ytd-browse[page-subtype="channels"] { background: var(--bg) !important; }
ytd-c4-tabbed-header-renderer, ytd-tabbed-page-header { background: var(--bg-dark) !important; }
yt-tab-shape[tab-title="Shorts"], yt-tab-shape[tab-title="Community"] { display: none !important; }

/* ── SETTINGS — fully inline-styled by JS ── */

/* ── OVERLAY MODE — centered panel instead of side-docked ── */
body.mindful-mode-overlay.mindful-panel-comments ytd-watch-flexy #comments,
body.mindful-mode-overlay.mindful-panel-comments ytd-watch-flexy ytd-comments#comments,
body.mindful-mode-overlay.mindful-panel-recs ytd-watch-flexy #secondary,
body.mindful-mode-overlay.mindful-panel-details ytd-watch-flexy #above-the-fold,
body.mindful-mode-overlay.mindful-panel-chat ytd-watch-flexy ytd-live-chat-frame#chat {
    top: 50% !important; left: 50% !important; right: auto !important; bottom: auto !important;
    transform: translate(-50%, -50%) !important;
    height: 70vh !important; max-height: 70vh !important;
    box-shadow: 0 8px 48px rgba(0,0,0,0.8) !important;
    animation: panel-pop 0.18s ease !important;
}
body.mindful-mode-overlay.mindful-panel-recs ytd-watch-flexy #secondary {
    top: 50% !important; left: 50% !important; right: auto !important; bottom: auto !important;
    transform: translate(-50%, -50%) !important;
    height: 70vh !important;
}
@keyframes panel-pop {
    from { opacity: 0; transform: translate(-50%, calc(-50% + 16px)); }
    to   { opacity: 1; transform: translate(-50%, -50%); }
}

/* ── FULLSCREEN ── */
body:fullscreen #mindful-sidebar, body:-webkit-full-screen #mindful-sidebar { display: none !important; }
:fullscreen ytd-page-manager, :-webkit-full-screen ytd-page-manager { margin-left: 0 !important; }
:fullscreen #movie_player, :-webkit-full-screen #movie_player { max-height: 100vh !important; height: 100vh !important; }

/* ── DESKTOP (>1024px) — 6 tiles, wider panel ── */
@media (min-width: 1025px) {
    ytd-rich-grid-renderer { --ytd-rich-grid-items-per-row: 6 !important; }
    ytd-rich-item-renderer { width: calc(100%/6 - 8px) !important; max-width: calc(100%/6 - 8px) !important; }
    body.mindful-panel-comments ytd-watch-flexy #comments,
    body.mindful-panel-comments ytd-watch-flexy ytd-comments#comments,
    body.mindful-panel-recs ytd-watch-flexy #secondary,
    body.mindful-panel-details ytd-watch-flexy #above-the-fold,
    body.mindful-panel-chat ytd-watch-flexy ytd-live-chat-frame#chat { width: var(--mindful-panel-w) !important; }
    body.mindful-panel-recs ytd-watch-flexy #secondary { width: var(--mindful-panel-w) !important; }
}

/* ── PHONE (≤600px) ── */
@media (max-width: 600px) {
    :root { --sidebar-w: 0px; }

    /* Bottom nav bar */
    #mindful-sidebar {
        top: auto !important; bottom: 0 !important; left: 0 !important; right: 0 !important;
        width: 100% !important; height: 48px !important;
        flex-direction: row !important; justify-content: space-around !important;
        padding: 0 !important; border-right: none !important; border-top: 1px solid var(--border) !important;
    }
    #mindful-sidebar .sep { display: none !important; }
    #mindful-sidebar button { width: 40px; height: 44px; }
    #mindful-sidebar button::after { display: none !important; }

    /* Page margin */
    ytd-page-manager { margin-left: 0 !important; margin-bottom: 48px !important; }
    ytd-app[guide-persistent-and-visible] #page-manager.ytd-app { margin-left: 0 !important; }

    /* Home grid — 1 col */
    ytd-rich-grid-renderer {
        --ytd-rich-grid-items-per-row: 1 !important;
        --ytd-rich-grid-posts-per-row: 1 !important;
        --ytd-rich-grid-slim-items-per-row: 1 !important;
        padding: 0 !important;
    }
    ytd-rich-grid-row #contents.ytd-rich-grid-row { gap: 0 !important; }
    ytd-rich-item-renderer {
        width: 100% !important; max-width: 100% !important;
        padding: 0 0 8px 0 !important; margin: 0 !important;
    }
    #video-title-link, #video-title { font-size: 13px !important; }
    #details.ytd-rich-grid-media, #meta.ytd-rich-grid-media { padding: 8px !important; }

    /* Watch page — player fills screen minus bottom bar */
    ytd-watch-flexy #player-wide-container.ytd-watch-flexy,
    ytd-watch-flexy #player-theater-container.ytd-watch-flexy,
    ytd-watch-flexy #player-container-outer.ytd-watch-flexy {
        height: calc(100vh - 48px) !important; max-height: calc(100vh - 48px) !important;
    }
    #movie_player { max-height: calc(100vh - 48px) !important; }

    /* Panels become bottom sheet on phone */
    body.mindful-panel-comments ytd-watch-flexy #comments,
    body.mindful-panel-comments ytd-watch-flexy ytd-comments#comments,
    body.mindful-panel-recs ytd-watch-flexy #secondary,
    body.mindful-panel-details ytd-watch-flexy #above-the-fold,
    body.mindful-panel-chat ytd-watch-flexy ytd-live-chat-frame#chat {
        top: auto !important; bottom: 48px !important; left: 0 !important; right: 0 !important;
        width: 100% !important; height: 55vh !important; max-height: 55vh !important;
        border-left: none !important; border-top: 2px solid var(--border) !important;
    }
    body.mindful-panel-recs ytd-watch-flexy #secondary {
        top: auto !important; bottom: 48px !important; left: 0 !important; right: 0 !important;
        width: 100% !important; height: 55vh !important;
    }

    /* Search overlay */
    #mindful-search { padding-top: 10vh !important; }
    #mindful-search input { width: 92% !important; max-width: none !important; font-size: 16px !important; }
    #mindful-suggest { width: 92% !important; max-width: none !important; }

    /* Search results — single column */
    ytd-search ytd-item-section-renderer #contents { grid-template-columns: 1fr !important; }
    ytd-search ytd-video-renderer ytd-thumbnail img { aspect-ratio: 16/9 !important; }

    /* Channel bar */
    #mindful-channel-bar { bottom: 48px !important; font-size: 11px !important; }
}
`;

    const MINDFUL_MOBILE_CSS = `
/* YouTube Mindful — Mobile (m.youtube.com) */
/* Separate from desktop — mobile uses ytm-* elements, not ytd-* */

:root {
    --bg: #101010; --bg-dark: #0a0a0a; --bg-float: #181818;
    --bg-hover: #252525; --bg-sel: #2a2a2a;
    --fg: #e8e2d6; --fg-dim: #8a8a8a; --fg-dark: #4a4a4a;
    --border: #2a2a2a;
    --accent: #c8c0b0;
}

/* ── Global colors ── */
html, body, ytm-app, ytm-browse,
ytm-single-column-browse-results-renderer {
    background-color: var(--bg) !important;
    color: var(--fg) !important;
}
html[darker-dark-theme] {
    background-color: var(--bg) !important;
    --yt-spec-base-background: var(--bg) !important;
    --yt-spec-raised-background: var(--bg) !important;
    --yt-spec-general-background-a: var(--bg) !important;
    --yt-spec-text-primary: var(--fg) !important;
    --yt-spec-text-secondary: var(--fg-dim) !important;
}

/* ── No border radius ── */
*, *::after, *::before { border-radius: 0 !important; }

/* ── Hide header ── */
ytm-mobile-topbar-renderer, ytm-header, #header { display: none !important; }

/* ── Hide bottom nav ── */
ytm-pivot-bar-renderer { display: none !important; }
[has-pivot-bar=true] ytm-app { padding-bottom: 48px !important; }

/* ── Hide chips ── */
ytm-feed-filter-chip-bar-renderer, .chip-bar { display: none !important; }

/* ── Hide shorts ── */
ytm-reel-shelf-renderer, ytm-reel-item-renderer,
a[href*="/shorts/"] { display: none !important; }

/* ── Home grid ── */
.rich-grid-renderer-contents {
    display: flex !important; flex-wrap: wrap !important;
    gap: 0 !important; padding: 0 !important; margin: 0 !important;
}
ytm-rich-item-renderer {
    width: 100% !important; display: block !important; margin: 0 !important;
}
ytm-media-item[use-vertical-layout] {
    padding: 0 !important; margin: 0 0 8px 0 !important;
}
.video-thumbnail-container-large { border-radius: 0 !important; }

/* Video titles */
.media-item-headline {
    font-size: 13px !important; color: var(--fg) !important;
    line-height: 1.3 !important;
}
.media-item-metadata, .media-item-info,
ytm-badge-and-byline-renderer {
    font-size: 11px !important; color: var(--fg-dim) !important;
}
.media-channel { font-size: 11px !important; color: var(--fg-dim) !important; }

/* ── Watch page ── */
.player-container { background: #000 !important; }
.watch-main-col { background: var(--bg) !important; }

ytm-slim-video-information-renderer {
    background: var(--bg-float) !important; color: var(--fg) !important;
    padding: 8px 12px !important;
}
.slim-video-information-title {
    font-size: 14px !important; color: var(--fg) !important;
}
ytm-slim-video-action-bar-renderer {
    background: var(--bg-float) !important;
}
.slim-video-action-bar-actions button {
    color: var(--fg-dim) !important;
}
ytm-slim-video-metadata-section-renderer ytm-slim-owner-renderer {
    background: var(--bg-float) !important;
    border-top: 1px solid var(--border) !important;
}

/* Related videos on watch page */
ytm-single-column-watch-next-results-renderer {
    background: var(--bg) !important;
}
ytm-video-with-context-renderer {
    background: var(--bg) !important;
}
ytm-comments-entry-point-header-renderer {
    background: var(--bg-float) !important; color: var(--fg) !important;
}

/* ── Engagement panels (comments, description) ── */
.engagement-panel-container {
    background: var(--bg-float) !important; color: var(--fg) !important;
}
.engagement-panel-section-list-header {
    background: var(--bg-float) !important; color: var(--fg) !important;
    border-bottom: 1px solid var(--border) !important;
}
ytm-comment-thread-renderer {
    border-bottom: 1px solid var(--border) !important;
}
.comment-text { color: var(--fg) !important; }
.comment-title { color: var(--fg-dim) !important; }
.comment-published-time { color: var(--fg-dark) !important; }

/* ── Menus / dialogs ── */
.menu-content {
    background: var(--bg-float) !important; color: var(--fg) !important;
}
html[darker-dark-theme] .menu-content,
html[darker-dark-theme] .menu-full-width .menu-content {
    background: var(--bg-float) !important;
}
html[darker-dark-theme] .dialog {
    background: var(--bg-float) !important;
}

/* ── Search ── */
.searchbox-input {
    color: var(--fg) !important;
    background: var(--bg-float) !important;
}
.searchbox-dropdown, .searchbox-dropdown .sbdd_b {
    background: var(--bg-dark) !important; color: var(--fg) !important;
}

/* ── Links ── */
a, a:visited { color: var(--fg) !important; }
a:hover { color: var(--accent) !important; }

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 4px !important; }
::-webkit-scrollbar-track { background: var(--bg-dark) !important; }
::-webkit-scrollbar-thumb { background: var(--fg-dark) !important; }

/* ── Channel pages ── */
ytm-c4-tabbed-header-renderer, .single-column-browse-results-tab-bar {
    background: var(--bg-dark) !important; color: var(--fg) !important;
}
.single-column-browse-results-tabs { color: var(--fg) !important; }

/* ── Subscriptions / Library ── */
ytm-section-list-renderer { background: var(--bg) !important; }
ytm-shelf-renderer { background: var(--bg) !important; }
ytm-item-section-renderer { background: var(--bg) !important; }
ytm-compact-link-renderer { color: var(--fg) !important; }
.compact-link-icon { fill: var(--fg-dim) !important; }
`;


    // ── Anti-backoff: prevent YouTube fake buffering ──
    // Intercept fetch to inject isInlinePlaybackNoAd into player requests
    // This prevents SABR backoff delays on both cold and SPA navigation
    const realFetch = window.fetch;
    window.fetch = function(input, init) {
        if (init && init.body && typeof init.body === "string" && init.body.includes('"contentPlaybackContext":{')) {
            init.body = init.body.replace('"contentPlaybackContext":{', '"contentPlaybackContext":{"isInlinePlaybackNoAd":true,');
        }
        return realFetch.apply(this, arguments);
    };
    // Also hook Object.assign as backup
    const realAssign = Object.assign;
    Object.assign = function() {
        const ret = realAssign.apply(this, arguments);
        if (arguments.length === 3 && ret && ret.body && typeof ret.body === "string" && ret.body.includes('"contentPlaybackContext":{')) {
            ret.body = ret.body.replace('"contentPlaybackContext":{', '"contentPlaybackContext":{"isInlinePlaybackNoAd":true,');
        }
        return ret;
    };

    const isWatch = () => location.pathname === "/watch";
    const isLive  = () => !!document.querySelector("ytd-live-chat-frame#chat, .ytp-live-badge[disabled], .ytp-live");

    // ── Redirect m.youtube.com → www.youtube.com (mobile uses different DOM) ──
    if (location.hostname === "m.youtube.com") {
        location.replace(location.href.replace("m.youtube.com", "www.youtube.com"));
        return;
    }

    // ── Inject CSS (so it works without separate .user.css install) ──
    const isMobile = location.hostname === "m.youtube.com";
    function injectCSS() {
        if (document.getElementById("mindful-css")) return;
        const s = document.createElement("style");
        s.id = "mindful-css";
        s.textContent = isMobile ? MINDFUL_MOBILE_CSS : MINDFUL_CSS;
        (document.head || document.documentElement).appendChild(s);
    }
    // Inject ASAP and also on DOMContentLoaded as fallback
    if (document.head) injectCSS();
    else document.addEventListener("DOMContentLoaded", injectCSS, { once: true });

    // On mobile, build minimal UI (our own elements only, zero YouTube DOM touching)
    if (isMobile) {
        const waitBody = fn => document.body ? fn() : document.addEventListener("DOMContentLoaded", fn, { once: true });
        waitBody(() => {
            console.log("[YouTube Mindful] Mobile mode active on", location.hostname);
            // Search overlay
            let mSearchEl, mSearchInput, mSuggestEl, mSuggestTimer;
            function mBuildSearch() {
                mSearchEl = document.createElement("div");
                Object.assign(mSearchEl.style, {
                    position:"fixed", inset:"0", background:"rgba(0,0,0,0.88)",
                    zIndex:"100001", display:"none", alignItems:"flex-start",
                    justifyContent:"center", paddingTop:"10vh",
                });
                const wrap = document.createElement("div");
                Object.assign(wrap.style, { display:"flex", flexDirection:"column", width:"92%" });
                mSearchInput = document.createElement("input"); mSearchInput.type = "text"; mSearchInput.placeholder = "search youtube...";
                Object.assign(mSearchInput.style, {
                    width:"100%", background:C.bgDark, border:"none",
                    borderBottom:`2px solid ${C.accent}`, color:C.fg,
                    fontFamily:"monospace", fontSize:"16px", padding:"10px 4px", outline:"none",
                });
                mSuggestEl = document.createElement("div");
                Object.assign(mSuggestEl.style, {
                    width:"100%", background:C.bgDark, maxHeight:"40vh",
                    overflowY:"auto", display:"none", border:`1px solid ${C.border}`, borderTop:"none",
                });
                mSearchInput.addEventListener("keydown", e => {
                    e.stopImmediatePropagation();
                    if (e.key === "Enter") {
                        const s = mSuggestEl.querySelector(".sel");
                        const q = s ? s.dataset.q : mSearchInput.value.trim();
                        if (q) location.href = `/results?search_query=${encodeURIComponent(q)}`;
                        mCloseSearch();
                    } else if (e.key === "Escape") { mCloseSearch(); }
                });
                mSearchInput.addEventListener("input", () => {
                    clearTimeout(mSuggestTimer);
                    mSuggestTimer = setTimeout(() => {
                        const q = mSearchInput.value.trim();
                        if (!q) { while(mSuggestEl.firstChild) mSuggestEl.removeChild(mSuggestEl.firstChild); mSuggestEl.style.display="none"; return; }
                        if (typeof GM_xmlhttpRequest !== "undefined") {
                            GM_xmlhttpRequest({
                                method:"GET",
                                url:"https://suggestqueries-clients6.youtube.com/complete/search?client=firefox&ds=yt&q="+encodeURIComponent(q),
                                onload: function(res) {
                                    try {
                                        const d = JSON.parse(res.responseText);
                                        if (d && d[1]) {
                                            while(mSuggestEl.firstChild) mSuggestEl.removeChild(mSuggestEl.firstChild);
                                            d[1].forEach(item => {
                                                const text = Array.isArray(item) ? item[0] : String(item);
                                                const div = document.createElement("div"); div.dataset.q = text;
                                                Object.assign(div.style, { padding:"10px 12px", cursor:"pointer", fontFamily:"monospace", fontSize:"14px", color:C.fg, borderBottom:`1px solid ${C.border}` });
                                                div.textContent = text;
                                                div.addEventListener("click", () => { location.href = `/results?search_query=${encodeURIComponent(text)}`; mCloseSearch(); });
                                                mSuggestEl.appendChild(div);
                                            });
                                            mSuggestEl.style.display = "block";
                                        }
                                    } catch(e) {}
                                }
                            });
                        }
                    }, 200);
                });
                wrap.append(mSearchInput, mSuggestEl);
                mSearchEl.appendChild(wrap);
                mSearchEl.addEventListener("click", e => { if (e.target === mSearchEl) mCloseSearch(); });
                document.body.appendChild(mSearchEl);
            }
            function mOpenSearch() { mSearchEl.style.display = "flex"; mSearchInput.value = ""; mSearchInput.focus(); }
            function mCloseSearch() { mSearchEl.style.display = "none"; while(mSuggestEl.firstChild) mSuggestEl.removeChild(mSuggestEl.firstChild); mSuggestEl.style.display = "none"; }

            // Bottom bar
            const bar = document.createElement("div");
            Object.assign(bar.style, {
                position:"fixed", bottom:"0", left:"0", right:"0", height:"48px",
                background:C.bgDark, borderTop:`1px solid ${C.border}`,
                display:"flex", justifyContent:"space-around", alignItems:"center",
                zIndex:"99999",
            });
            const btns = [
                { label:"Home", icon:"M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z", action:()=>location.href="/" },
                { label:"Search", icon:"M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z", action:mOpenSearch },
                { label:"Subs", icon:"M18 1H6a2 2 0 00-2 2h16a2 2 0 00-2-2zm3 4H3a2 2 0 00-2 2v13a2 2 0 002 2h18a2 2 0 002-2V7a2 2 0 00-2-2zM3 20V7h18v13H3zm13-6.5L10 10v7l6-3.5z", action:()=>location.href="/feed/subscriptions" },
                { label:"History", icon:"M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7a6.98 6.98 0 01-4.95-2.05l-1.41 1.41A8.96 8.96 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z", action:()=>location.href="/feed/history" },
            ];
            btns.forEach(b => {
                const btn = document.createElement("button");
                Object.assign(btn.style, { width:"44px", height:"44px", border:"none", background:"transparent", color:C.fgDim, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" });
                const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
                svg.setAttribute("viewBox","0 0 24 24"); svg.setAttribute("width","22"); svg.setAttribute("height","22");
                svg.style.pointerEvents = "none";
                const path = document.createElementNS("http://www.w3.org/2000/svg","path");
                path.setAttribute("d", b.icon); path.setAttribute("fill","currentColor");
                svg.appendChild(path); btn.appendChild(svg);
                btn.addEventListener("click", e => { e.preventDefault(); b.action(); });
                bar.appendChild(btn);
            });
            document.body.appendChild(bar);

            // Add bottom padding so content isn't hidden behind bar
            const spacer = document.createElement("style");
            spacer.textContent = "body { padding-bottom: 48px !important; }";
            document.head.appendChild(spacer);

            mBuildSearch();
        });
        return;
    }

    function isTyping() {
        const a = document.activeElement;
        if (!a) return false;
        const t = a.tagName.toLowerCase();
        return t === "input" || t === "textarea" || a.isContentEditable;
    }

    // ── Stats injection (for details panel) ──
    function injectStats() {
        document.getElementById("mindful-stats")?.remove();
        document.getElementById("mindful-title-inject")?.remove();
        const get = s => document.querySelector(s)?.textContent?.trim() || "";
        const title = get("ytd-watch-flexy h1.ytd-watch-metadata yt-formatted-string")
                   || get("ytd-watch-flexy #title h1 yt-formatted-string") || get("ytd-watch-flexy #title");
        const channel = get("ytd-watch-flexy ytd-channel-name a") || get("ytd-watch-flexy #channel-name a");
        const info = get("ytd-watch-flexy #info-container yt-formatted-string#info");
        let likes = "";
        const lb = document.querySelector("ytd-watch-flexy like-button-view-model button, ytd-watch-flexy button[aria-label*='like' i]");
        if (lb) { const m = (lb.getAttribute("aria-label") || "").match(/([\d,]+)/); likes = m ? m[1] : ""; }

        const container = document.querySelector("ytd-watch-flexy #above-the-fold");
        if (!container) return;
        if (title) {
            const el = document.createElement("div"); el.id = "mindful-title-inject";
            const t = document.createElement("div");
            Object.assign(t.style, { fontSize:"14px", fontWeight:"bold", color:C.fg, marginBottom:"4px" });
            t.textContent = title;
            el.appendChild(t);
            if (channel) { const ch = document.createElement("div"); Object.assign(ch.style, { fontSize:"11px", color:C.cyan }); ch.textContent = channel; el.appendChild(ch); }
            container.insertBefore(el, container.firstChild);
        }
        const bar = document.createElement("div"); bar.id = "mindful-stats";
        const addStat = (text, color) => { const s = document.createElement("span"); s.style.color = color; s.textContent = text; bar.appendChild(s); };
        const addDot = () => { const s = document.createElement("span"); s.style.color = C.fgDark; s.textContent = " · "; bar.appendChild(s); };
        if (info) { addStat(info, C.cyan); }
        if (likes) { if (info) addDot(); addStat(likes + " likes", C.green); }
        if (!info && !likes) addStat("stats unavailable", C.fgDim);
        const ref = document.getElementById("mindful-title-inject");
        if (ref) ref.after(bar); else container.insertBefore(bar, container.firstChild);
    }

    // ── Panels — just toggle body classes, CSS does the rest ──
    function openPanel(name) {
        if (state.panelOpen) closePanel();
        if (name === "chat" && !isLive()) return;
        document.body.classList.add(panelClasses[name]);
        state.panelOpen = name;
        if (name === "details") setTimeout(injectStats, 200);
        if (name === "recs") setTimeout(() => window.dispatchEvent(new Event("resize")), 80);
        updateSidebar();
    }

    function closePanel() {
        if (!state.panelOpen) return;
        document.body.classList.remove(panelClasses[state.panelOpen]);
        if (state.panelOpen === "details") {
            document.getElementById("mindful-stats")?.remove();
            document.getElementById("mindful-title-inject")?.remove();
        }
        state.panelOpen = null;
        updateSidebar();
    }

    function togglePanel(name) { state.panelOpen === name ? closePanel() : openPanel(name); }

    // ── Search overlay ──
    let searchEl, searchInput, suggestEl, suggestTimer;

    function buildSearch() {
        searchEl = document.createElement("div"); searchEl.id = "mindful-search";

        const wrap = document.createElement("div");
        Object.assign(wrap.style, { display:"flex", flexDirection:"column", width:"60%", maxWidth:"700px" });

        const row = document.createElement("div");
        Object.assign(row.style, { display:"flex", alignItems:"center" });

        const slash = document.createElement("span");
        slash.textContent = "/";
        Object.assign(slash.style, { color:C.yellow, fontFamily:'"JetBrains Mono",monospace', fontSize:"22px", marginRight:"8px" });

        searchInput = document.createElement("input"); searchInput.type = "text"; searchInput.placeholder = "search youtube...";
        Object.assign(searchInput.style, {
            flex:"1", background:C.bgDark, border:"none",
            borderBottom:`2px solid ${C.accent}`, color:C.fg,
            fontFamily:'"JetBrains Mono",monospace', fontSize:"18px",
            padding:"10px 4px", outline:"none",
        });

        suggestEl = document.createElement("div");
        Object.assign(suggestEl.style, {
            width:"100%", background:C.bgDark, marginTop:"2px",
            maxHeight:"40vh", overflowY:"auto", display:"none",
            border:`1px solid ${C.border}`, borderTop:"none",
        });

        searchInput.addEventListener("keydown", e => {
            e.stopImmediatePropagation();
            if (e.key === "Enter") {
                const s = suggestEl.querySelector(".sel");
                const q = s ? s.dataset.q : searchInput.value.trim();
                if (q) location.href = `/results?search_query=${encodeURIComponent(q)}`;
                closeSearch();
            } else if (e.key === "Escape") { e.preventDefault(); closeSearch(); }
            else if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) { e.preventDefault(); moveSuggest(1); }
            else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) { e.preventDefault(); moveSuggest(-1); }
        });
        searchInput.addEventListener("input", () => {
            clearTimeout(suggestTimer);
            suggestTimer = setTimeout(() => fetchSuggest(searchInput.value.trim()), 150);
        });

        row.append(slash, searchInput);
        wrap.append(row, suggestEl);
        searchEl.appendChild(wrap);
        searchEl.addEventListener("click", e => { if (e.target === searchEl) closeSearch(); });
        document.body.appendChild(searchEl);
    }

    function fetchSuggest(q) {
        if (!q) { while(suggestEl.firstChild) suggestEl.removeChild(suggestEl.firstChild); suggestEl.style.display = "none"; return; }
        if (typeof GM_xmlhttpRequest !== "undefined") {
            GM_xmlhttpRequest({
                method: "GET",
                url: "https://suggestqueries-clients6.youtube.com/complete/search?client=firefox&ds=yt&q=" + encodeURIComponent(q),
                onload: function(res) {
                    try { const d = JSON.parse(res.responseText); if (d && d[1]) renderSuggest(d[1], q); } catch(e) {}
                }
            });
        }
    }

    function renderSuggest(items, q) {
        while(suggestEl.firstChild) suggestEl.removeChild(suggestEl.firstChild);
        if (!items.length) { suggestEl.style.display = "none"; return; }
        items.forEach(item => {
            const text = Array.isArray(item) ? item[0] : String(item);
            const div = document.createElement("div"); div.dataset.q = text;
            Object.assign(div.style, {
                padding:"8px 12px", cursor:"pointer",
                fontFamily:'"JetBrains Mono",monospace', fontSize:"13px",
                color:C.fg, borderBottom:`1px solid ${C.border}`,
            });
            const lo = text.toLowerCase(), lq = q.toLowerCase(), mi = lo.indexOf(lq);
            if (mi >= 0) {
                div.appendChild(document.createTextNode(text.slice(0, mi)));
                const b = document.createElement("span");
                Object.assign(b.style, { color:C.accent, fontWeight:"bold" });
                b.textContent = text.slice(mi, mi + q.length);
                div.appendChild(b);
                div.appendChild(document.createTextNode(text.slice(mi + q.length)));
            } else { div.textContent = text; }
            div.addEventListener("mouseenter", () => { clearSel(); div.classList.add("sel"); div.style.background=C.bgHover; div.style.color=C.accent; });
            div.addEventListener("mouseleave", () => { div.classList.remove("sel"); div.style.background="transparent"; div.style.color=C.fg; });
            div.addEventListener("click", () => { location.href = `/results?search_query=${encodeURIComponent(text)}`; closeSearch(); });
            suggestEl.appendChild(div);
        });
        suggestEl.style.display = "block";
    }

    function clearSel() {
        suggestEl.querySelectorAll(".sel").forEach(el => {
            el.classList.remove("sel"); el.style.background="transparent"; el.style.color=C.fg;
        });
    }

    function moveSuggest(dir) {
        const items = [...suggestEl.querySelectorAll("[data-q]")]; if (!items.length) return;
        const cur = suggestEl.querySelector(".sel"); let idx = cur ? items.indexOf(cur) : -1;
        clearSel();
        idx = (idx + dir + items.length) % items.length;
        items[idx].classList.add("sel"); items[idx].style.background = C.bgHover; items[idx].style.color = C.accent;
        items[idx].scrollIntoView({ block:"nearest" });
        searchInput.value = items[idx].dataset.q;
    }

    function openSearch() { if (state.panelOpen) closePanel(); searchEl.classList.add("open"); searchInput.value = ""; searchInput.focus(); }
    function closeSearch() { searchEl.classList.remove("open"); searchInput.blur(); while(suggestEl.firstChild) suggestEl.removeChild(suggestEl.firstChild); suggestEl.style.display = "none"; }

    // ── Settings ──
    const DEFAULTS = { panelMode: "side", panelWidth: 380, keyComments: "x", keyRecs: "z", keyDetails: "q" };
    let prefs = { ...DEFAULTS };

    function loadPrefs() {
        try { const s = localStorage.getItem("mindful-prefs"); if (s) Object.assign(prefs, JSON.parse(s)); } catch {}
        applyPrefs();
    }
    function savePrefs() { localStorage.setItem("mindful-prefs", JSON.stringify(prefs)); applyPrefs(); }
    function applyPrefs() {
        document.body.classList.toggle("mindful-mode-overlay", prefs.panelMode === "overlay");
        document.documentElement.style.setProperty("--mindful-panel-w", prefs.panelWidth + "px");
    }

    let settingsEl;
    function buildSettings() {
        settingsEl = document.createElement("div");
        settingsEl.id = "mindful-settings";
        settingsEl.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.88);z-index:100002;display:none;justify-content:center;align-items:center";

        const R = "display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;color:"+C.fgDim+";font-size:11px";
        const I = "width:80px;background:"+C.bgDark+";color:"+C.fg+";border:1px solid "+C.border+";font-family:\"JetBrains Mono\",monospace;font-size:11px;padding:4px 6px;text-align:center;cursor:pointer";

        const el = (tag, style, text) => { const e = document.createElement(tag); if (style) e.style.cssText = style; if (text) e.textContent = text; return e; };

        const box = el("div", "background:"+C.bgFloat+";border:1px solid "+C.border+";padding:20px 24px;width:340px;max-width:90vw;font-family:\"JetBrains Mono\",monospace;font-size:12px;color:"+C.fg);
        box.appendChild(el("div", "font-size:13px;color:"+C.accent+";border-bottom:1px solid "+C.border+";padding-bottom:8px;margin-bottom:16px;font-weight:bold", "⚙ Mindful Settings"));

        // Panel mode
        const modeRow = el("div", R); modeRow.appendChild(el("span", null, "Panel mode"));
        const modeSelect = el("select", "background:"+C.bgDark+";color:"+C.fg+";border:1px solid "+C.border+";font-family:inherit;font-size:11px;padding:4px 6px");
        const o1 = el("option", null, "Side panel"); o1.value = "side";
        const o2 = el("option", null, "Overlay"); o2.value = "overlay";
        modeSelect.append(o1, o2); modeSelect.dataset.s = "panelMode";
        modeRow.appendChild(modeSelect); box.appendChild(modeRow);

        // Panel width
        const widthRow = el("div", R); widthRow.appendChild(el("span", null, "Panel width"));
        const ww = el("span", "display:flex;align-items:center;gap:8px");
        const widthRange = document.createElement("input"); widthRange.type = "range"; widthRange.min = "280"; widthRange.max = "600"; widthRange.step = "10";
        widthRange.style.cssText = "width:100px;accent-color:"+C.accent; widthRange.dataset.s = "panelWidth";
        const widthVal = el("span", "color:"+C.accent+";min-width:45px;text-align:right;font-size:11px"); widthVal.dataset.s = "panelWidthVal";
        ww.append(widthRange, widthVal); widthRow.appendChild(ww); box.appendChild(widthRow);

        // Keybindings
        const ks = el("div", "margin-top:14px;padding-top:12px;border-top:1px solid "+C.border);
        ks.appendChild(el("div", "font-size:11px;color:"+C.accent+";margin-bottom:10px", "Keybindings — click field, press key (Esc to clear)"));
        ["Comments:keyComments", "Recommendations:keyRecs", "Details:keyDetails"].forEach(pair => {
            const [label, key] = pair.split(":");
            const row = el("div", R); row.appendChild(el("span", null, label));
            const inp = document.createElement("input"); inp.readOnly = true; inp.style.cssText = I; inp.dataset.key = key;
            row.appendChild(inp); ks.appendChild(row);
        });
        box.appendChild(ks);

        // Close
        const closeBtn = el("button", "display:block;margin-top:16px;width:100%;padding:6px;background:"+C.bgDark+";color:"+C.fg+";border:1px solid "+C.border+";font-family:inherit;font-size:11px;cursor:pointer;text-align:center", "Close");
        box.appendChild(closeBtn);
        settingsEl.appendChild(box);

        // Events
        settingsEl.addEventListener("click", e => { if (e.target === settingsEl) closeSettings(); });
        closeBtn.addEventListener("click", closeSettings);
        modeSelect.addEventListener("change", function() { prefs.panelMode = this.value; savePrefs(); });
        widthRange.addEventListener("input", function() { prefs.panelWidth = +this.value; widthVal.textContent = this.value + "px"; savePrefs(); });
        settingsEl.querySelectorAll("[data-key]").forEach(inp => {
            inp.addEventListener("keydown", e => {
                e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
                const k = inp.dataset.key;
                if (e.key === "Escape" || e.key === "Backspace") { prefs[k] = ""; inp.value = "(none)"; }
                else { prefs[k] = e.key; inp.value = e.key; }
                savePrefs();
            });
        });

        document.body.appendChild(settingsEl);
    }

    function openSettings() {
        if (state.panelOpen) closePanel();
        settingsEl.querySelector("[data-s=panelMode]").value = prefs.panelMode;
        settingsEl.querySelector("[data-s=panelWidth]").value = prefs.panelWidth;
        settingsEl.querySelector("[data-s=panelWidthVal]").textContent = prefs.panelWidth + "px";
        settingsEl.querySelectorAll("[data-key]").forEach(inp => { inp.value = prefs[inp.dataset.key] || "(none)"; });
        settingsEl.style.display = "flex";
    }
    function closeSettings() { settingsEl.style.display = "none"; }

    // ── Sidebar ──
    let sidebar;
    const sidebarBtns = {};

    // SVG icon helper
    const ico = (d, size=20) => {
        const s = document.createElementNS("http://www.w3.org/2000/svg","svg");
        s.setAttribute("viewBox","0 0 24 24"); s.setAttribute("width",size); s.setAttribute("height",size);
        s.style.cssText = "pointer-events:none;display:block;";
        const p = document.createElementNS("http://www.w3.org/2000/svg","path");
        p.setAttribute("d", d); p.setAttribute("fill", "currentColor");
        s.appendChild(p);
        return s;
    };
    const ICONS = {
        home:    "M12 3l9 7.5V21h-6v-6H9v6H3V10.5L12 3z",
        search:  "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
        back:    "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
        subs:    "M18 1H6a2 2 0 00-2 2h16a2 2 0 00-2-2zm3 4H3a2 2 0 00-2 2v13a2 2 0 002 2h18a2 2 0 002-2V7a2 2 0 00-2-2zM3 20V7h18v13H3zm13-6.5L10 10v7l6-3.5z",
        details: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
        recs:    "M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z",
        comments:"M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z",
        chat:    "M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L2 22l5.71-.97A9.96 9.96 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z",
        settings:"M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.6 3.6 0 0112 15.6z",
        history: "M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7a6.98 6.98 0 01-4.95-2.05l-1.41 1.41A8.96 8.96 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z",
        watchlater:"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z",
        playlist:"M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zm11.5-4.33v5.66l5-2.83-5-2.83z",
        bell:    "M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z",
        person:  "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2a7.2 7.2 0 01-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 01-6 3.22z",
    };

    function buildSidebar() {
        sidebar = document.createElement("div"); sidebar.id = "mindful-sidebar";
        const items = [
            { id:"home",   icon:"home",   label:"Home",    action: () => { if (location.pathname !== "/") { const l = document.querySelector("a#logo,a[href='/']"); l ? l.click() : (location.href="/"); } }},
            { id:"search", icon:"search", label:"Search",  action: openSearch },
            { id:"back",   icon:"back",   label:"Back",    action: () => history.back() },
            "sep",
            { id:"details",  icon:"details",  label:"Details",         action: () => isWatch() && togglePanel("details") },
            { id:"recs",     icon:"recs",     label:"Recommendations", action: () => isWatch() && togglePanel("recs") },
            { id:"comments", icon:"comments", label:"Comments",        action: () => isWatch() && togglePanel("comments") },
            { id:"chat",     icon:"chat",     label:"Live Chat",       action: () => isWatch() && isLive() && togglePanel("chat") },
            "sep",
            { id:"subs",      icon:"subs",      label:"Subscriptions", action: () => location.href="/feed/subscriptions" },
            { id:"history",   icon:"history",    label:"History",       action: () => location.href="/feed/history" },
            { id:"watchlater",icon:"watchlater", label:"Watch Later",   action: () => location.href="/playlist?list=WL" },
            { id:"playlist",  icon:"playlist",   label:"Playlists",     action: () => location.href="/feed/playlists" },
            "sep",
            { id:"settings", icon:"settings", label:"Settings",        action: openSettings },
        ];
        items.forEach(item => {
            if (item === "sep") { const s = document.createElement("div"); s.className = "sep"; sidebar.appendChild(s); return; }
            const b = document.createElement("button");
            b.setAttribute("aria-label", item.label);
            b.appendChild(ico(ICONS[item.icon]));
            b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); item.action(); });
            sidebar.appendChild(b);
            sidebarBtns[item.id] = b;
        });
        document.body.appendChild(sidebar);
        updateSidebar();

        // Add notification + profile proxy buttons after a delay
        setTimeout(addProxyButtons, 2000);
    }

    function addProxyButtons() {
        if (!sidebar || sidebar.querySelector("[data-proxy]")) return;

        // Notification bell — our own SVG button that clicks the hidden YT one
        const bellBtn = document.createElement("button");
        bellBtn.setAttribute("aria-label", "Notifications");
        bellBtn.dataset.proxy = "bell";
        bellBtn.appendChild(ico(ICONS.bell || "M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"));
        bellBtn.addEventListener("click", e => {
            e.preventDefault(); e.stopPropagation();
            const real = document.querySelector("ytd-notification-topbar-button-renderer button");
            if (real) real.click();
        });

        // Profile avatar — our own button that clicks the hidden YT one
        const avatarBtn = document.createElement("button");
        avatarBtn.setAttribute("aria-label", "Account");
        avatarBtn.dataset.proxy = "avatar";
        // Try to grab the actual avatar image src
        const avatarImg = document.querySelector("ytd-topbar-menu-button-renderer #avatar-btn img");
        if (avatarImg && avatarImg.src) {
            const img = document.createElement("img");
            img.setAttribute("src", avatarImg.getAttribute("src"));
            img.style.cssText = "width:24px;height:24px;border-radius:50%!important;pointer-events:none;";
            avatarBtn.appendChild(img);
        } else {
            avatarBtn.appendChild(ico("M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2a7.2 7.2 0 01-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08a7.2 7.2 0 01-6 3.22z"));
        }
        avatarBtn.addEventListener("click", e => {
            e.preventDefault(); e.stopPropagation();
            const real = document.querySelector("ytd-topbar-menu-button-renderer #avatar-btn");
            if (real) real.click();
        });

        // Insert before last sep (before settings)
        const seps = sidebar.querySelectorAll(".sep");
        const lastSep = seps[seps.length - 1];
        if (lastSep) {
            sidebar.insertBefore(bellBtn, lastSep);
            sidebar.insertBefore(avatarBtn, lastSep);
        } else {
            sidebar.append(bellBtn, avatarBtn);
        }
    }

    function updateSidebar() {
        const w = isWatch();
        const phone = window.innerWidth <= 600;
        ["details","recs","comments"].forEach(id => { sidebarBtns[id].disabled = !w; });
        sidebarBtns.chat.disabled = !w || !isLive();
        PANELS.forEach(id => { sidebarBtns[id].classList.toggle("active", state.panelOpen === id); });
        // On phone, only show essential buttons in bottom bar
        const phoneHide = ["back","subs","history","watchlater","playlist"];
        phoneHide.forEach(id => { if (sidebarBtns[id]) sidebarBtns[id].style.display = phone ? "none" : ""; });
    }

    // ── Keyboard — just Escape ──
    function onKey(e) {
        if (isTyping()) return;
        if (e.key === "Escape") {
            if (settingsEl.style.display === "flex") { closeSettings(); return; }
            if (searchEl.classList.contains("open")) { closeSearch(); return; }
            if (state.panelOpen) { closePanel(); return; }
        }
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        if (isWatch()) {
            if (prefs.keyComments && e.key === prefs.keyComments) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); togglePanel("comments"); return; }
            if (prefs.keyRecs && e.key === prefs.keyRecs) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); togglePanel("recs"); return; }
            if (prefs.keyDetails && e.key === prefs.keyDetails) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); togglePanel("details"); return; }
        }
    }

    // ── Channel tab bar ──
    const isChannel = () => /^\/((@|channel\/|c\/|user\/).+)/.test(location.pathname);
    let channelBar;

    function clickTab(title) {
        for (const t of document.querySelectorAll("yt-tab-shape")) {
            const name = (t.getAttribute("tab-title") || t.textContent || "").trim();
            if (name.toLowerCase() === title.toLowerCase()) {
                const btn = t.querySelector(".yt-tab-shape__tab, [role='tab']") || t;
                btn.click(); return;
            }
        }
    }

    function buildChannelBar() {
        if (channelBar) { channelBar.remove(); channelBar = null; }
        if (!isChannel()) return;

        channelBar = document.createElement("div");
        channelBar.id = "mindful-channel-bar";
        channelBar.style.cssText = "position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:99998;display:flex;gap:2px;background:"+C.bgDark+";border:1px solid "+C.border+";padding:4px 6px;font-family:\"JetBrains Mono\",monospace;font-size:11px;";

        ["Videos","Playlists","Live","Home"].forEach(name => {
            const b = document.createElement("button");
            b.textContent = name;
            b.style.cssText = "background:none;border:1px solid transparent;color:"+C.fgDim+";font-family:inherit;font-size:11px;padding:5px 12px;cursor:pointer;";
            b.addEventListener("mouseenter", () => { b.style.color = C.fg; b.style.borderColor = C.border; });
            b.addEventListener("mouseleave", () => { b.style.color = C.fgDim; b.style.borderColor = "transparent"; });
            b.addEventListener("click", e => { e.preventDefault(); clickTab(name); });
            channelBar.appendChild(b);
        });

        document.body.appendChild(channelBar);
    }

    // ── SPA nav ──
    function onNav() {
        if (state.panelOpen) closePanel();
        if (searchEl?.classList.contains("open")) closeSearch();
        updateSidebar();
        buildChannelBar();
    }

    // ── Init ──
    function init() {
        console.log("[YouTube Mindful] v8 init");
        loadPrefs();
        buildSidebar();
        buildSearch();
        buildSettings();
        document.body.style.overscrollBehavior = "none";

        if ("ontouchstart" in window) {
            let lastNav = 0;
            document.addEventListener("click", e => {
                const link = e.target.closest("a[href]");
                if (!link) return;
                const now = Date.now();
                if (now - lastNav < 400) { e.preventDefault(); e.stopImmediatePropagation(); return; }
                lastNav = now;
            }, true);
        }

        window.addEventListener("keydown", onKey, true);
        document.addEventListener("keydown", onKey, true);
        window.addEventListener("yt-navigate-finish", onNav);
        document.addEventListener("fullscreenchange", () => {
            if (sidebar) sidebar.style.display = document.fullscreenElement ? "none" : "";
        });

        let lastUrl = location.href;
        new MutationObserver(() => {
            if (location.href !== lastUrl) { lastUrl = location.href; onNav(); }
        }).observe(document.body, { childList:true, subtree:true });

        setTimeout(updateSidebar, 500);
        setTimeout(updateSidebar, 2000);
        setTimeout(buildChannelBar, 500);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();

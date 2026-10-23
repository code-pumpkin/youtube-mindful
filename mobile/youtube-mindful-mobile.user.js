// ==UserScript==
// @name         YouTube Mindful Mobile
// @namespace    youtube-mindful-mobile
// @version      4.0.0
// @description  Mindful YouTube — mobile, calm design system + prewarmed panels.
// @author       codePumpkin
// @match        https://m.youtube.com/*
// @grant        GM_xmlhttpRequest
// @connect      suggestqueries-clients6.youtube.com
// @connect      *
// @run-at       document-start
// ==/UserScript==

(function () {
    "use strict";

    const C = {
        bg:"#121110", bgDark:"#0d0c0b", bgFloat:"#1a1917",
        bgHover:"#232120", bgSel:"#232120", border:"#2a2724",
        fg:"#eae5dc", fgDim:"#a39d94", fgDark:"#8e8981",
        accent:"#b8a98f", cyan:"#8ba3b8", magenta:"#b8a98f",
        green:"#8faa78", yellow:"#c9b177", red:"#c4796b",
    };

    // ── Anti-backoff ──
    const realFetch = window.fetch;
    window.fetch = function(input, init) {
        if (init && init.body && typeof init.body === "string" && init.body.includes('"contentPlaybackContext":{'))
            init.body = init.body.replace('"contentPlaybackContext":{', '"contentPlaybackContext":{"isInlinePlaybackNoAd":true,');
        return realFetch.apply(this, arguments);
    };

    // ── Background playback — spoof Page Visibility API ──
    Object.defineProperty(document, "hidden", { get: () => false });
    Object.defineProperty(document, "visibilityState", { get: () => "visible" });
    document.addEventListener("visibilitychange", e => e.stopImmediatePropagation(), true);

    // ── CSS ──
    const CSS = `
/* ══════════════════════════════════════════════════════════════════
   DESIGN TOKENS — identical scale to desktop
   ══════════════════════════════════════════════════════════════════ */
:root {
    --bg:         #121110;
    --bg-sunken:  #0d0c0b;
    --surface:    #1a1917;
    --surface-2:  #232120;
    --border:     #2a2724;

    --fg:         #eae5dc;   /* 15.0:1 */
    --fg-muted:   #a39d94;   /*  7.0:1 */
    --fg-subtle:  #8e8981;   /*  5.1:1 */

    --accent:     #b8a98f;   /*  8.2:1 */
    --success:    #8faa78;
    --warning:    #c9b177;
    --danger:     #c4796b;
    --info:       #8ba3b8;

    /* legacy aliases */
    --bg-dark: var(--bg-sunken);  --bg-float: var(--surface);
    --bg-hover: var(--surface-2); --bg-sel: var(--surface-2);
    --fg-dim: var(--fg-muted);    --fg-dark: var(--fg-subtle);
    --cyan: var(--info); --magenta: var(--accent);
    --green: var(--success); --yellow: var(--warning);

    --radius: 6px; --radius-sm: 4px; --radius-pill: 9999px;

    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    --mono: "JetBrains Mono", "SF Mono", monospace;
    --fs-xs: 12px; --fs-sm: 13px; --fs-base: 15px; --fs-lg: 17px;

    --sp-1: 4px; --sp-2: 8px; --sp-3: 12px;
    --sp-4: 16px; --sp-5: 20px; --sp-6: 24px;

    --dur: 160ms;
    --ease: cubic-bezier(0.2, 0, 0.2, 1);

    /* bar height incl. safe area — single source of truth */
    --bar-h: 52px;
    --bar-total: calc(var(--bar-h) + env(safe-area-inset-bottom, 0px));

    --z-panel: 100000; --z-nav: 100000; --z-overlay: 100001; --z-modal: 100002;
}

@media (prefers-reduced-motion: reduce) {
    :root { --dur: 1ms; }
    *, *::before, *::after {
        animation-duration: 1ms !important; transition-duration: 1ms !important;
        animation-iteration-count: 1 !important; scroll-behavior: auto !important;
    }
}

/* ══════════════════════════════════════════════════════════════════
   GLOBAL
   ══════════════════════════════════════════════════════════════════ */
html, body, ytm-app, ytm-browse,
ytm-single-column-browse-results-renderer,
ytm-single-column-watch-next-results-renderer,
ytm-watch, ytm-settings {
    background-color: var(--bg) !important;
    color: var(--fg) !important;
}
body { font-family: var(--sans) !important; }
html[darker-dark-theme] {
    background-color: var(--bg) !important;
    --yt-spec-base-background: var(--bg) !important;
    --yt-spec-raised-background: var(--surface) !important;
    --yt-spec-general-background-a: var(--bg) !important;
    --yt-spec-general-background-b: var(--bg) !important;
    --yt-spec-general-background-c: var(--bg) !important;
    --yt-spec-text-primary: var(--fg) !important;
    --yt-spec-text-secondary: var(--fg-muted) !important;
    --yt-spec-badge-chip-background: var(--surface-2) !important;
}

/* ── RADIUS — softened ── */
*, *::after, *::before { border-radius: var(--radius-sm) !important; }
ytm-media-item .media-item-thumbnail-container,
ytm-media-item img, ytm-video-with-context-renderer img {
    border-radius: var(--radius) !important;
}
.slim-owner-profile-icon, .slim-owner-profile-icon img,
ytm-profile-icon, ytm-profile-icon img { border-radius: 50% !important; }
#player, .player-container, video { border-radius: 0 !important; }
.yt-spec-button-shape-next, ytm-badge-and-byline-renderer .badge {
    border-radius: var(--radius-pill) !important;
}

:focus-visible { outline: 2px solid var(--accent) !important; outline-offset: 2px !important; }

/* ══════════════════════════════════════════════════════════════════
   HIDE YT HEADER + NAV
   ══════════════════════════════════════════════════════════════════ */
ytm-mobile-topbar-renderer, ytm-header, #header, #header-bar {
    height: 0 !important; min-height: 0 !important; overflow: hidden !important;
    opacity: 0 !important; pointer-events: none !important;
}
ytm-app { padding-top: 0 !important; }
.player-container { top: 0 !important; }
#player.inline-player-hidden, .inline-player-hidden {
    opacity: 1 !important; pointer-events: auto !important;
}
ytm-pivot-bar-renderer {
    height: 0 !important; min-height: 0 !important; overflow: hidden !important;
    opacity: 0 !important; pointer-events: none !important;
}
ytm-app { padding-bottom: var(--bar-total) !important; }
ytm-feed-filter-chip-bar-renderer, .chip-bar, .rich-grid-sticky-header {
    height: 0 !important; overflow: hidden !important; opacity: 0 !important;
}

/* ══════════════════════════════════════════════════════════════════
   NUKE SHORTS, ADS, POSTS
   ══════════════════════════════════════════════════════════════════ */
ytm-reel-shelf-renderer, ytm-reel-item-renderer,
ytm-shorts-lockup-view-model, grid-shelf-view-model,
ad-slot-renderer, ytm-promoted-video-renderer,
ytm-promoted-sparkles-web-renderer, ytm-companion-ad-renderer,
ytm-statement-banner-renderer, ytm-backstage-post-thread-renderer,
ytm-backstage-post-renderer, .reel-shelf-header, .pivot-shorts,
a[href*="/shorts/"], ytm-rich-section-renderer { display: none !important; }

/* ══════════════════════════════════════════════════════════════════
   HOME FEED — calm single column with breathing room
   ══════════════════════════════════════════════════════════════════ */
.rich-grid-renderer { margin: 0 !important; }
.rich-grid-renderer-contents { padding: 0 !important; margin: 0 !important; }
ytm-rich-item-renderer {
    display: block !important; width: 100% !important;
    margin: 0 !important; padding: 0 !important;
    --ytm-rich-item-margin: 0px !important;
    --ytm-rich-item-container-margin: 0px !important;
    --ytm-rich-item-dismissal-margin: 0px !important;
}
ytm-video-with-context-renderer, ytm-radio-renderer { margin: 0 !important; padding: 0 !important; }
ytm-media-item { padding: 0 0 var(--sp-4) 0 !important; margin: 0 !important; }
ytm-media-item .media-item-thumbnail-container { margin-bottom: 0 !important; }
ytm-media-item .details {
    padding: var(--sp-3) var(--sp-4) 0 !important; margin: 0 !important;
    border-bottom: none !important;
}
.media-item-headline {
    font-family: var(--sans) !important; font-size: var(--fs-base) !important;
    color: var(--fg) !important; line-height: 1.4 !important; font-weight: 500 !important;
}
.media-item-metadata, .media-item-info {
    font-family: var(--mono) !important; font-size: var(--fs-xs) !important;
    color: var(--fg-subtle) !important;
}
ytm-badge-and-byline-renderer, .media-channel {
    font-family: var(--sans) !important; font-size: var(--fs-sm) !important;
    color: var(--fg-muted) !important;
}
ytm-media-item .media-item-menu { display: none !important; }
ytm-thumbnail-overlay-time-status-renderer, .thumbnail-overlay-time-status-renderer {
    font-family: var(--mono) !important; font-size: var(--fs-xs) !important;
}

/* ══════════════════════════════════════════════════════════════════
   WATCH PAGE
   ══════════════════════════════════════════════════════════════════ */
.player-container { background: #000 !important; }
.watch-main-col { background: var(--bg) !important; padding: 0 !important; }
ytm-single-column-watch-next-results-renderer { background: var(--bg) !important; }
ytm-companion-slot { display: none !important; }
ytm-related-chip-cloud-renderer { display: none !important; }

/* Current Related sections remain in native document flow. */

/* ── Title + channel ── */
ytm-slim-video-information-renderer {
    background: var(--bg) !important; color: var(--fg) !important;
    padding: var(--sp-4) var(--sp-4) var(--sp-2) !important; margin: 0 !important;
}
.slim-video-metadata-header { padding: 0 !important; margin: 0 !important; }
.slim-video-information-title, .slim-video-metadata-title-modern {
    font-family: var(--sans) !important; font-size: var(--fs-lg) !important;
    color: var(--fg) !important; line-height: 1.35 !important;
    font-weight: 600 !important; margin: 0 !important;
}
.modern-panel-with-inline-badge-subtitle { margin-top: var(--sp-2) !important; }
.modern-panel-with-inline-badge-subtitle .secondary-text,
.modern-panel-with-inline-badge-subtitle .ytAttributedStringHost {
    font-family: var(--mono) !important; font-size: var(--fs-xs) !important;
    color: var(--fg-subtle) !important;
}
.slim-video-metadata-information-inline-badge { display: none !important; }
.slim-video-information-show-more {
    display: inline-flex !important;
    min-height: 44px !important;
    align-items: center !important;
    color: var(--accent) !important;
    font-family: var(--sans) !important;
    font-size: var(--fs-sm) !important;
}

/* Current mobile metadata ViewModel — preserve native interaction and hierarchy. */
yt-video-metadata-view-model {
    display: block !important;
    background: var(--bg) !important;
    color: var(--fg) !important;
    padding: var(--sp-4) !important;
}
yt-video-metadata-view-model .ytAttributedStringHost {
    color: var(--fg) !important;
    font-family: var(--sans) !important;
}
yt-video-metadata-view-model .ytAttributedStringWhiteSpaceNoWrap,
.slim-video-information-title > .ytAttributedStringHost {
    display: -webkit-box !important;
    max-width: 100% !important;
    overflow: hidden !important;
    white-space: normal !important;
    -webkit-box-orient: vertical !important;
    -webkit-line-clamp: 2 !important;
}
yt-video-metadata-view-model .ytVideoSubtitleViewModelSubstring {
    font-size: var(--fs-sm) !important;
}
yt-video-metadata-view-model .ytVideoSubtitleViewModelSubstring:not(.ytVideoSubtitleViewModelBoldSubstring) {
    color: var(--fg-muted) !important;
}
ytm-slim-video-action-bar-renderer {
    display: flex !important;
    align-items: center !important;
    background: var(--bg) !important;
    padding: 0 var(--sp-4) var(--sp-3) !important;
}
ytm-slim-video-action-bar-renderer .ytSpecButtonShapeNextHost {
    color: var(--fg) !important;
}

ytm-slim-owner-renderer {
    background: var(--bg) !important; padding: var(--sp-3) var(--sp-4) !important;
    border-bottom: 1px solid var(--border) !important;
}
.slim-owner-icon-and-title {
    display: flex !important; align-items: center !important;
    gap: var(--sp-3) !important; flex: 1 !important;
}
.slim-owner-profile-icon, .slim-owner-profile-icon img { width: 32px !important; height: 32px !important; }
.slim-owner-channel-name {
    color: var(--fg) !important; font-family: var(--sans) !important;
    font-size: var(--fs-base) !important; font-weight: 500 !important; margin: 0 !important;
}
.slim-owner-subtitle, .slim-owner-bylines div {
    color: var(--fg-muted) !important; font-family: var(--mono) !important; font-size: var(--fs-xs) !important;
}
.slim-owner-subscribe-button { margin-left: auto !important; }

/* ══════════════════════════════════════════════════════════════════
   WATCH BUTTON ROW
   ══════════════════════════════════════════════════════════════════ */
#mindful-watch-btns {
    display: flex; gap: 0;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
}
#mindful-watch-btns button {
    flex: 1; min-height: 44px; padding: var(--sp-2) 0;
    border: none; background: transparent;
    color: var(--fg-muted); font-family: var(--sans); font-size: var(--fs-xs);
    cursor: pointer; -webkit-tap-highlight-color: transparent;
    border-radius: 0 !important;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: var(--sp-1); position: relative;
    transition: color var(--dur) var(--ease), background var(--dur) var(--ease);
}
#mindful-watch-btns button.active { color: var(--accent); background: var(--surface); }
#mindful-watch-btns button.active::after {
    content: ""; position: absolute; left: 25%; right: 25%; bottom: 0;
    height: 2px; background: var(--accent); border-radius: var(--radius-pill);
}
/* Prewarm indicator — subtle dot, content is ready */
#mindful-watch-btns button[data-warm="ready"] .warm-dot {
    opacity: 1;
}
#mindful-watch-btns button .warm-dot {
    position: absolute; top: var(--sp-2); right: 22%;
    width: 4px; height: 4px; border-radius: 50%;
    background: var(--success); opacity: 0;
    transition: opacity var(--dur) var(--ease);
}

/* ══════════════════════════════════════════════════════════════════
   DESCRIPTION
   ══════════════════════════════════════════════════════════════════ */
#mindful-watch-desc {
    padding: var(--sp-4); font-family: var(--sans); font-size: var(--fs-sm);
    color: var(--fg-muted); line-height: 1.6;
    white-space: pre-wrap; word-break: break-word;
    max-width: 672px;
}
#mindful-watch-desc .chapter {
    display: block; padding: var(--sp-2) 0; color: var(--fg);
    font-family: var(--mono); font-size: var(--fs-sm);
    cursor: pointer; -webkit-tap-highlight-color: transparent;
    min-height: 44px; display: flex; align-items: center;
    transition: color var(--dur) var(--ease);
}
#mindful-watch-desc .chapter:hover { color: var(--accent); }

/* ══════════════════════════════════════════════════════════════════
   PANELS — fullscreen via body classes
   WARM state gives real geometry (so YouTube fetches) but stays
   invisible and inert behind the page.
   ══════════════════════════════════════════════════════════════════ */
body.mindful-m-details ytm-slim-video-metadata-section-renderer,
body.mindful-warm-details ytm-slim-video-metadata-section-renderer,
body.mindful-m-related ytm-item-section-renderer.scwnr-content[section-identifier=related-items],
body.mindful-warm-related ytm-item-section-renderer.scwnr-content[section-identifier=related-items] {
    position: fixed !important; top: 0 !important; left: 0 !important;
    right: 0 !important; bottom: 0 !important;
    width: 100% !important; height: 100% !important;
    overflow-y: auto !important; -webkit-overflow-scrolling: touch !important;
    background: var(--bg) !important;
    border-radius: 0 !important;
    z-index: var(--z-panel) !important;
    display: block !important; visibility: visible !important;
    opacity: 1 !important; pointer-events: auto !important;
    padding: var(--sp-6) 0 var(--bar-total) !important;
    margin: 0 !important; border: none !important;
}
body.mindful-m-details ytm-slim-video-metadata-section-renderer,
body.mindful-m-related ytm-item-section-renderer.scwnr-content[section-identifier=related-items] {
    animation: panel-in var(--dur) var(--ease) !important;
}
@keyframes panel-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
}

/* ── WARM-ONLY — invisible + inert ── */
body.mindful-warm-details:not(.mindful-m-details) ytm-slim-video-metadata-section-renderer,
body.mindful-warm-related:not(.mindful-m-related) ytm-item-section-renderer.scwnr-content[section-identifier=related-items] {
    opacity: 0 !important;
    pointer-events: none !important;
    z-index: -1 !important;
    animation: none !important;
}
/* Descendant interaction is blocked by the inert attribute set in JS. */

/* ── Details panel action bar ── */
body.mindful-m-details ytm-slim-video-action-bar-renderer { display: flex !important; }
body.mindful-m-details ytm-slim-video-action-bar-renderer .slim-video-action-bar-actions {
    display: flex !important; gap: var(--sp-2) !important; padding: var(--sp-3) var(--sp-4) !important;
    flex-wrap: wrap !important;
}
body.mindful-m-details .slim_video_action_bar_renderer_button button,
body.mindful-m-details .ytSegmentedLikeDislikeButtonViewModelSegmentedButtonsWrapper button {
    color: var(--fg-muted) !important; background: var(--surface-2) !important;
    min-height: 44px !important;
}
body.mindful-m-details .ytSegmentedLikeDislikeButtonViewModelSegmentedButtonsWrapper {
    background: var(--surface-2) !important;
}

/* ── Related list ── */
body.mindful-m-related ytm-video-with-context-renderer {
    background: var(--bg) !important; display: block !important;
    border-bottom: 1px solid var(--border) !important;
    padding: 0 0 var(--sp-3) 0 !important; margin: 0 0 var(--sp-3) 0 !important;
}
body.mindful-m-related ytm-video-with-context-renderer .details { padding: var(--sp-3) var(--sp-4) 0 !important; }
body.mindful-m-related ytm-video-with-context-renderer .media-item-headline {
    font-size: var(--fs-sm) !important; line-height: 1.4 !important;
}

/* ══════════════════════════════════════════════════════════════════
   COMMENTS TEASER
   ══════════════════════════════════════════════════════════════════ */
ytm-item-section-renderer.scwnr-content:not([section-identifier]) {
    background: var(--bg) !important; padding: 0 var(--sp-2) !important;
    border-bottom: 1px solid var(--border) !important;
}
yt-video-metadata-carousel-view-model { background: var(--bg) !important; }
.ytCarouselTitleViewModelTitle {
    color: var(--fg) !important; font-family: var(--sans) !important;
    font-size: var(--fs-base) !important; font-weight: 500 !important;
}
.ytCarouselTitleViewModelSubtitle {
    color: var(--fg-muted) !important; font-family: var(--sans) !important; font-size: var(--fs-sm) !important;
}
.ytCommentsEntryPointTeaserViewModelTeaser {
    color: var(--fg-muted) !important; font-family: var(--sans) !important; font-size: var(--fs-sm) !important;
}
.ytCarouselDotsShapeDot { background: var(--surface-2) !important; }
.ytCarouselDotsShapeDotActive { background: var(--accent) !important; }

/* ══════════════════════════════════════════════════════════════════
   PANEL CLOSE BUTTON — 44px touch target
   ══════════════════════════════════════════════════════════════════ */
#mindful-panel-close {
    position: fixed; top: var(--sp-2); right: var(--sp-3); z-index: var(--z-modal);
    display: none; align-items: center; justify-content: center;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--fg); font-size: var(--fs-base);
    width: 44px; height: 44px;
    cursor: pointer; font-family: var(--sans);
    -webkit-tap-highlight-color: transparent;
    transition: background var(--dur) var(--ease);
}
#mindful-panel-close:hover { background: var(--surface-2); }
body.mindful-m-details #mindful-panel-close,
body.mindful-m-related #mindful-panel-close,
body.mindful-m-comments-open #mindful-panel-close { display: flex !important; }

/* ══════════════════════════════════════════════════════════════════
   ENGAGEMENT PANELS (native comments)
   ══════════════════════════════════════════════════════════════════ */
bottom-sheet-container,
.engagement-panel-container {
    background: var(--surface) !important;
    color: var(--fg) !important;
}
.yt-spec-bottom-sheet-layout-content {
    background: var(--surface) !important;
    color: var(--fg) !important;
    padding-bottom: var(--bar-total) !important;
}
ytm-structured-description-content-renderer,
ytm-video-description-header-renderer {
    background: var(--surface) !important;
    color: var(--fg) !important;
}
ytm-structured-description-content-renderer .ytAttributedStringHost,
ytm-video-description-header-renderer .ytAttributedStringHost,
ytm-structured-description-content-renderer .ytwFactoidRendererValue {
    color: var(--fg) !important;
}
ytm-structured-description-content-renderer a .ytAttributedStringHost {
    color: var(--info) !important;
}
ytm-structured-description-content-renderer .ytwFactoidRendererLabel {
    color: var(--fg-muted) !important;
}
[panel-identifier="engagement-panel-comments-section"] {
    visibility: visible !important; opacity: 1 !important;
    height: auto !important; overflow: visible !important;
}
[panel-identifier="engagement-panel-comments-section"] ytm-item-section-renderer,
[panel-identifier="engagement-panel-comments-section"] .section-list,
[panel-identifier="engagement-panel-comments-section"] ytm-continuation-item-renderer {
    visibility: visible !important; opacity: 1 !important;
    height: auto !important; display: block !important;
}
ytm-engagement-panel-section-list-renderer ytm-button-renderer.close-button {
    display: block !important;
    width: 44px !important;
    height: 44px !important;
    margin-left: auto !important;
    overflow: visible !important;
    padding: 0 !important;
}
ytm-engagement-panel-section-list-renderer ytm-button-renderer.close-button button {
    width: 44px !important;
    height: 44px !important;
    color: var(--fg) !important;
}
ytm-comment-thread-renderer {
    border-bottom: 1px solid var(--border) !important;
    padding: var(--sp-3) var(--sp-4) !important;
}
.comment-text {
    color: var(--fg) !important; font-family: var(--sans) !important;
    font-size: var(--fs-sm) !important; line-height: 1.6 !important;
}
.comment-title { color: var(--fg-muted) !important; font-family: var(--sans) !important; font-size: var(--fs-xs) !important; }
.comment-vote-count, .comment-published-time {
    font-family: var(--mono) !important; font-size: var(--fs-xs) !important; color: var(--fg-subtle) !important;
}
ytm-crawler-description {
    color: var(--fg-muted) !important; font-family: var(--sans) !important;
    font-size: var(--fs-sm) !important; line-height: 1.6 !important;
}

/* ══════════════════════════════════════════════════════════════════
   MENUS / DIALOGS
   ══════════════════════════════════════════════════════════════════ */
.menu-content, html[darker-dark-theme] .menu-content,
html[darker-dark-theme] .menu-full-width .menu-content {
    background: var(--surface) !important; color: var(--fg) !important;
}
html[darker-dark-theme] .dialog { background: var(--surface) !important; }
.yt-spec-bottom-sheet-layout { background: var(--surface) !important; }

/* ══════════════════════════════════════════════════════════════════
   SEARCH
   ══════════════════════════════════════════════════════════════════ */
.mobile-topbar-header[data-mode=searching] { background-color: var(--bg-sunken) !important; }
.searchbox-input { color: var(--fg) !important; background: var(--surface) !important; }
.search-bar { background: var(--surface-2) !important; }
.searchbox-dropdown, .searchbox-dropdown .sbdd_b { background: var(--surface) !important; color: var(--fg) !important; }

#mindful-m-search {
    position: fixed; inset: 0; background: rgba(13, 12, 11, 0.9);
    backdrop-filter: blur(4px);
    z-index: var(--z-overlay); display: none; align-items: flex-start;
    justify-content: center; padding-top: 12vh;
}
#mindful-m-search.open { display: flex !important; }

/* ══════════════════════════════════════════════════════════════════
   LINKS / CHANNEL / SUBS / SETTINGS
   ══════════════════════════════════════════════════════════════════ */
a, a:visited { color: var(--fg) !important; }
ytm-c4-tabbed-header-renderer, .single-column-browse-results-tab-bar {
    background: var(--bg-sunken) !important; color: var(--fg) !important;
}
ytm-section-list-renderer, ytm-shelf-renderer, ytm-item-section-renderer { background: var(--bg) !important; }
ytm-compact-link-renderer { color: var(--fg) !important; }
.compact-link-icon { fill: var(--fg-muted) !important; }
.setting-generic-category-title-block h2, .setting-title-subtitle-block h3 { color: var(--fg) !important; }
.yt-spec-button-shape-next--mono.yt-spec-button-shape-next--filled {
    background-color: var(--accent) !important; color: var(--bg) !important;
}
html[darker-dark-theme] c3-toast { background: var(--surface) !important; color: var(--fg) !important; }

/* ══════════════════════════════════════════════════════════════════
   BOTTOM BAR — 44px targets, safe-area aware
   ══════════════════════════════════════════════════════════════════ */
#mindful-m-bar {
    position: fixed; bottom: 0; left: 0; right: 0;
    min-height: var(--bar-h);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: var(--bg-sunken);
    border-top: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-around;
    z-index: var(--z-nav);
}
#mindful-m-bar button {
    flex: 1; max-width: 80px; min-height: 44px;
    border: none; background: transparent;
    color: var(--fg-muted); cursor: pointer;
    border-radius: var(--radius-sm);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: var(--sp-1); font-size: var(--fs-xs); font-family: var(--sans);
    -webkit-tap-highlight-color: transparent;
    transition: color var(--dur) var(--ease), background var(--dur) var(--ease);
    position: relative;
}
#mindful-m-bar button:active { background: var(--surface-2); }
#mindful-m-bar button.active { color: var(--accent) !important; }
#mindful-m-bar button.active::before {
    content: ""; position: absolute; top: 0; left: 30%; right: 30%;
    height: 2px; background: var(--accent); border-radius: var(--radius-pill);
}
#mindful-m-bar button svg { pointer-events: none; }

/* ══════════════════════════════════════════════════════════════════
   SCROLLBAR
   ══════════════════════════════════════════════════════════════════ */
* { scrollbar-width: thin; scrollbar-color: var(--surface-2) transparent; }
::-webkit-scrollbar { width: 4px !important; }
::-webkit-scrollbar-track { background: transparent !important; }
::-webkit-scrollbar-thumb { background: var(--surface-2) !important; border-radius: var(--radius-pill) !important; }

/* ══════════════════════════════════════════════════════════════════
   320px FLOOR
   ══════════════════════════════════════════════════════════════════ */
@media (max-width: 360px) {
    #mindful-m-bar button { font-size: 11px; }
    ytm-media-item .details { padding: var(--sp-2) var(--sp-3) 0 !important; }
    #mindful-watch-desc { padding: var(--sp-3) !important; }
    body { overflow-x: hidden !important; }
}
`;

    function injectCSS() {
        if (document.getElementById("mindful-m-css")) return;
        const s = document.createElement("style");
        s.id = "mindful-m-css";
        s.textContent = CSS;
        (document.head || document.documentElement).appendChild(s);
    }
    if (document.head) injectCSS();
    else document.addEventListener("DOMContentLoaded", injectCSS, { once: true });

    const ready = fn => {
        let ran = false;
        const run = () => { if (ran) return; ran = true; fn(); };
        if (document.body) run();
        else document.addEventListener("DOMContentLoaded", run, { once: true });
        // bfcache / prerender restores do not re-fire DOMContentLoaded —
        // pageshow does, on every restore including the very first load.
        window.addEventListener("pageshow", run);
    };

    ready(() => {
        const isWatch = () => location.pathname === "/watch";

        function ico(d, size) {
            size = size || 20;
            const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
            svg.setAttribute("viewBox","0 0 24 24"); svg.setAttribute("width", String(size)); svg.setAttribute("height", String(size));
            const p = document.createElementNS("http://www.w3.org/2000/svg","path");
            p.setAttribute("d", d); p.setAttribute("fill","currentColor");
            svg.appendChild(p); return svg;
        }

        // ── Search ──
        let searchEl, searchInput, suggestEl, suggestTimer;
        function buildSearch() {
            searchEl = document.createElement("div");
            searchEl.id = "mindful-m-search";
            const wrap = document.createElement("div");
            Object.assign(wrap.style, { display:"flex", flexDirection:"column", width:"88%", maxWidth:"500px" });

            const row = document.createElement("div");
            Object.assign(row.style, { display:"flex", alignItems:"center" });
            const slash = document.createElement("span");
            slash.textContent = "/";
            Object.assign(slash.style, { color:C.yellow, fontFamily:"monospace", fontSize:"22px", marginRight:"8px" });

            searchInput = document.createElement("input");
            searchInput.type = "text"; searchInput.placeholder = "search youtube...";
            Object.assign(searchInput.style, {
                flex:"1", background:C.bgDark, border:"none",
                borderBottom:`2px solid ${C.accent}`, color:C.fg,
                fontFamily:"monospace", fontSize:"16px", padding:"10px 4px", outline:"none",
            });

            suggestEl = document.createElement("div");
            Object.assign(suggestEl.style, {
                width:"100%", background:C.bgDark, maxHeight:"40vh",
                overflowY:"auto", display:"none", border:`1px solid ${C.border}`, borderTop:"none",
            });

            searchInput.addEventListener("keydown", e => {
                e.stopImmediatePropagation();
                if (e.key === "Enter") {
                    const q = searchInput.value.trim();
                    if (q) location.href = `/results?search_query=${encodeURIComponent(q)}`;
                    closeSearch();
                } else if (e.key === "Escape") closeSearch();
            });
            searchInput.addEventListener("input", () => {
                clearTimeout(suggestTimer);
                suggestTimer = setTimeout(() => fetchSuggest(searchInput.value.trim()), 200);
            });

            row.append(slash, searchInput);
            wrap.append(row, suggestEl);
            searchEl.appendChild(wrap);
            searchEl.addEventListener("click", e => { if (e.target === searchEl) closeSearch(); });
            document.body.appendChild(searchEl);
        }

        function fetchSuggest(q) {
            if (!q) { while(suggestEl.firstChild) suggestEl.removeChild(suggestEl.firstChild); suggestEl.style.display="none"; return; }
            if (typeof GM_xmlhttpRequest !== "undefined") {
                GM_xmlhttpRequest({
                    method:"GET",
                    url:"https://suggestqueries-clients6.youtube.com/complete/search?client=firefox&ds=yt&q="+encodeURIComponent(q),
                    onload: function(res) {
                        try { const d = JSON.parse(res.responseText); if (d && d[1]) renderSuggest(d[1]); } catch(e) {}
                    }
                });
            }
        }

        function renderSuggest(items) {
            while(suggestEl.firstChild) suggestEl.removeChild(suggestEl.firstChild);
            if (!items.length) { suggestEl.style.display = "none"; return; }
            items.forEach(item => {
                const text = Array.isArray(item) ? item[0] : String(item);
                const div = document.createElement("div");
                Object.assign(div.style, {
                    padding:"10px 12px", cursor:"pointer", fontFamily:"monospace",
                    fontSize:"14px", color:C.fg, borderBottom:`1px solid ${C.border}`,
                });
                div.textContent = text;
                div.addEventListener("click", () => {
                    location.href = `/results?search_query=${encodeURIComponent(text)}`;
                    closeSearch();
                });
                suggestEl.appendChild(div);
            });
            suggestEl.style.display = "block";
        }

        function openSearch() { searchEl.classList.add("open"); searchInput.value = ""; searchInput.focus(); }
        function closeSearch() { searchEl.classList.remove("open"); while(suggestEl.firstChild) suggestEl.removeChild(suggestEl.firstChild); suggestEl.style.display = "none"; }

        // ── Bottom bar ──
        const ICONS = {
            home:    "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
            search:  "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
            subs:    "M18 1H6a2 2 0 00-2 2h16a2 2 0 00-2-2zm3 4H3a2 2 0 00-2 2v13a2 2 0 002 2h18a2 2 0 002-2V7a2 2 0 00-2-2zM3 20V7h18v13H3zm13-6.5L10 10v7l6-3.5z",
            history: "M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7a6.98 6.98 0 01-4.95-2.05l-1.41 1.41A8.96 8.96 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z",
            back:    "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
        };

        const bar = document.createElement("div");
        bar.id = "mindful-m-bar";

        const btns = [
            { id:"home",    icon:"home",    label:"Home",    action:()=>location.href="/" },
            { id:"search",  icon:"search",  label:"Search",  action:openSearch },
            { id:"back",    icon:"back",    label:"Back",    action:()=>history.back() },
            { id:"subs",    icon:"subs",    label:"Subs",    action:()=>location.href="/feed/subscriptions" },
            { id:"history", icon:"history", label:"History", action:()=>location.href="/feed/history" },
        ];

        const barBtns = {};
        btns.forEach(item => {
            const b = document.createElement("button");
            b.appendChild(ico(ICONS[item.icon], 22));
            const lbl = document.createElement("span");
            lbl.textContent = item.label;
            b.appendChild(lbl);
            b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); item.action(); });
            bar.appendChild(b);
            barBtns[item.id] = b;
        });
        document.body.appendChild(bar);

        function updateBar() {
            const path = location.pathname;
            Object.values(barBtns).forEach(b => b.classList.remove("active"));
            if (path === "/") barBtns.home.classList.add("active");
            else if (path === "/feed/subscriptions") barBtns.subs.classList.add("active");
            else if (path === "/feed/history") barBtns.history.classList.add("active");
        }

        buildSearch();
        updateBar();

        // Current mobile metadata, actions, Comments, and Related stay native.
        // The custom bottom navigation does not relocate YouTube components.

        // ── Keep bar/search attached — YouTube's mobile shell can replace
        // document.body's subtree on some cold loads of "/", detaching
        // elements that were appended once at ready() time. ──
        function ensureAttached() {
            if (!document.body.contains(bar)) document.body.appendChild(bar);
            if (!document.body.contains(searchEl)) document.body.appendChild(searchEl);
        }

        // ── SPA nav ──
        let lastUrl = location.href;
        new MutationObserver(() => {
            ensureAttached();
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                if (searchEl.classList.contains("open")) closeSearch();
                updateBar();
            }
        }).observe(document.body, { childList:true, subtree:true });
    });
})();

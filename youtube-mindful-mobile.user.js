// ==UserScript==
// @name         YouTube Mindful Mobile
// @namespace    youtube-mindful-mobile
// @version      3.4.0
// @description  Mindful YouTube — mobile experience
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
        bg:"#101010", bgDark:"#0a0a0a", bgFloat:"#181818",
        bgHover:"#252525", bgSel:"#2a2a2a", border:"#2a2a2a",
        fg:"#e8e2d6", fgDim:"#8a8a8a", fgDark:"#4a4a4a",
        accent:"#c8c0b0", cyan:"#90b0c8", magenta:"#b8a0d0",
        green:"#8fbe7a", yellow:"#d4c090",
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
:root {
    --bg: #101010; --bg-dark: #0a0a0a; --bg-float: #181818;
    --bg-hover: #252525; --bg-sel: #2a2a2a;
    --fg: #e8e2d6; --fg-dim: #8a8a8a; --fg-dark: #4a4a4a;
    --border: #2a2a2a; --accent: #c8c0b0;
    --cyan: #90b0c8; --magenta: #b8a0d0; --mono: monospace;
}

/* ── Global ── */
html, body, ytm-app, ytm-browse,
ytm-single-column-browse-results-renderer,
ytm-single-column-watch-next-results-renderer,
ytm-watch, ytm-settings {
    background-color: var(--bg) !important;
    color: var(--fg) !important;
}
html[darker-dark-theme] {
    background-color: var(--bg) !important;
    --yt-spec-base-background: var(--bg) !important;
    --yt-spec-raised-background: var(--bg) !important;
    --yt-spec-general-background-a: var(--bg) !important;
    --yt-spec-general-background-b: var(--bg) !important;
    --yt-spec-general-background-c: var(--bg) !important;
    --yt-spec-text-primary: var(--fg) !important;
    --yt-spec-text-secondary: var(--fg-dim) !important;
    --yt-spec-badge-chip-background: var(--bg-sel) !important;
}
*, *::after, *::before { border-radius: 0 !important; }

/* ── Hide YT header — safe collapse ── */
ytm-mobile-topbar-renderer, ytm-header, #header,
#header-bar { height: 0 !important; min-height: 0 !important; overflow: hidden !important; opacity: 0 !important; pointer-events: none !important; }

/* ── Kill the 48px top gap left by hidden header ── */
ytm-app { padding-top: 0 !important; }
.player-container { top: 0 !important; }
/* Keep player visible even when YouTube tries to hide it */
#player.inline-player-hidden, .inline-player-hidden {
    opacity: 1 !important; pointer-events: auto !important;
}

/* ── Hide YT bottom nav — we replace it ── */
ytm-pivot-bar-renderer { height: 0 !important; min-height: 0 !important; overflow: hidden !important; opacity: 0 !important; pointer-events: none !important; }

/* ── Bottom padding for our bar ── */
ytm-app { padding-bottom: 56px !important; }

/* ── Hide chips ── */
ytm-feed-filter-chip-bar-renderer, .chip-bar,
.rich-grid-sticky-header { height: 0 !important; overflow: hidden !important; opacity: 0 !important; }

/* ── Nuke shorts, ads, posts ── */
ytm-reel-shelf-renderer, ytm-reel-item-renderer,
ytm-shorts-lockup-view-model,
grid-shelf-view-model,
ad-slot-renderer,
ytm-promoted-video-renderer,
ytm-promoted-sparkles-web-renderer,
ytm-companion-ad-renderer,
ytm-statement-banner-renderer,
ytm-backstage-post-thread-renderer,
ytm-backstage-post-renderer,
.reel-shelf-header,
.pivot-shorts,
a[href*="/shorts/"] { display: none !important; }

/* ── Rich sections: hide ones containing shorts/ads, keep others ── */
ytm-rich-section-renderer { display: none !important; }

/* ── Home feed — tight single column ── */
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
ytm-media-item {
    padding: 0 !important; margin: 0 !important;
}
ytm-media-item .media-item-thumbnail-container {
    margin-bottom: 0 !important;
}
ytm-media-item .details {
    padding: 8px 12px !important; margin: 0 !important;
    border-bottom: 1px solid var(--border) !important;
}
.media-item-headline {
    font-size: 13px !important; color: var(--fg) !important;
    line-height: 1.3 !important; font-weight: 400 !important;
    font-family: var(--mono) !important;
}
.media-item-metadata, .media-item-info, ytm-badge-and-byline-renderer {
    font-size: 11px !important; color: var(--fg-dim) !important; font-family: var(--mono) !important;
}
.media-channel { font-size: 11px !important; color: var(--fg-dim) !important; }
/* Kill the 3-dot menu on feed items */
ytm-media-item .media-item-menu { display: none !important; }

/* ── Watch page ── */
.player-container { background: #000 !important; }
.watch-main-col { background: var(--bg) !important; padding: 0 !important; }
ytm-single-column-watch-next-results-renderer { background: var(--bg) !important; }
ytm-companion-slot { display: none !important; }

/* ── Hide continuation spinner visually but keep functional for infinite scroll ── */
ytm-continuation-item-renderer { height: 1px !important; overflow: hidden !important; opacity: 0 !important; }

/* ── Watch: hide action bar + related chips, keep everything else ── */
ytm-slim-video-action-bar-renderer { display: none !important; }
ytm-related-chip-cloud-renderer { display: none !important; }
/* Related sections: collapse (not comments) */
ytm-item-section-renderer.scwnr-content[section-identifier] {
    height: 0 !important; overflow: hidden !important;
    opacity: 0 !important; pointer-events: none !important;
    padding: 0 !important; margin: 0 !important; border: none !important;
}

/* ── Title + channel stay visible ── */
ytm-slim-video-information-renderer {
    background: var(--bg) !important; color: var(--fg) !important;
    padding: 10px 14px 6px !important; margin: 0 !important;
}
.slim-video-metadata-header { padding: 0 !important; margin: 0 !important; }
.slim-video-information-title, .slim-video-metadata-title-modern {
    font-size: 15px !important; color: var(--fg) !important;
    font-family: var(--mono) !important; line-height: 1.3 !important;
    font-weight: 500 !important; margin: 0 !important;
}
.modern-panel-with-inline-badge-subtitle { margin-top: 4px !important; }
.modern-panel-with-inline-badge-subtitle .secondary-text,
.modern-panel-with-inline-badge-subtitle .ytAttributedStringHost {
    font-size: 11px !important; color: var(--fg-dim) !important;
    font-family: var(--mono) !important;
}
.slim-video-metadata-information-inline-badge { display: none !important; }
.slim-video-information-show-more { display: none !important; }

ytm-slim-owner-renderer {
    background: var(--bg) !important; padding: 8px 14px !important;
    border-bottom: 1px solid var(--border) !important;
}
.slim-owner-icon-and-title { display: flex !important; align-items: center !important; gap: 10px !important; flex: 1 !important; }
.slim-owner-profile-icon, .slim-owner-profile-icon img { width: 32px !important; height: 32px !important; }
.slim-owner-channel-name {
    color: var(--fg) !important; font-family: var(--mono) !important;
    font-size: 13px !important; font-weight: 500 !important; margin: 0 !important;
}
.slim-owner-subtitle, .slim-owner-bylines div {
    color: var(--fg-dim) !important; font-family: var(--mono) !important; font-size: 11px !important;
}
.slim-owner-subscribe-button { margin-left: auto !important; }

/* ── Panel buttons row ── */
#mindful-watch-btns {
    display: flex; gap: 0; border-bottom: 1px solid var(--border);
    background: var(--bg-dark);
}
#mindful-watch-btns button {
    flex: 1; padding: 10px 0; border: none; background: transparent;
    color: var(--fg-dim); font-family: monospace; font-size: 10px;
    cursor: pointer; -webkit-tap-highlight-color: transparent;
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column; align-items: center; gap: 3px;
}
#mindful-watch-btns button:last-child { border-right: none; }
#mindful-watch-btns button.active { color: var(--accent); background: var(--bg-sel); }
/* Details button default highlight — info is always visible */
#mindful-watch-btns button:first-child { color: var(--accent); }

/* ── Description area below buttons ── */
#mindful-watch-desc {
    padding: 14px; font-family: monospace; font-size: 12px;
    color: var(--fg-dim); line-height: 1.5;
    white-space: pre-wrap; word-break: break-word;
}
#mindful-watch-desc .chapter {
    display: block; padding: 6px 0; color: var(--cyan);
    cursor: pointer; -webkit-tap-highlight-color: transparent;
}

/* ── PANELS — full-screen via body classes (like desktop) ── */
/* Shared: all panels go full-screen fixed */
body.mindful-m-details ytm-slim-video-metadata-section-renderer {
    position: fixed !important; top: 0 !important; left: 0 !important;
    right: 0 !important; bottom: 0 !important;
    width: 100% !important; height: 100% !important;
    overflow-y: auto !important; -webkit-overflow-scrolling: touch !important;
    background: var(--bg) !important;
    z-index: 100002 !important;
    display: block !important; visibility: visible !important;
    padding: 48px 0 56px !important;
}
/* Comments: trigger native YouTube bottom sheet via JS click — no CSS panel */
/* Style the visible comments teaser */
ytm-item-section-renderer.scwnr-content:not([section-identifier]) {
    background: var(--bg) !important; padding: 0 8px !important;
    border-bottom: 1px solid var(--border) !important;
}
yt-video-metadata-carousel-view-model { background: var(--bg) !important; }
.ytCarouselTitleViewModelTitle {
    color: var(--fg) !important; font-family: monospace !important;
    font-size: 13px !important; font-weight: 500 !important;
}
.ytCarouselTitleViewModelSubtitle {
    color: var(--fg-dim) !important; font-family: monospace !important;
    font-size: 11px !important;
}
.ytCommentsEntryPointTeaserViewModelTeaser {
    color: var(--fg-dim) !important; font-family: monospace !important;
    font-size: 12px !important;
}
.ytCarouselDotsShapeDot { background: var(--fg-dark) !important; }
.ytCarouselDotsShapeDotActive { background: var(--accent) !important; }

/* Related: last section-identifier=related-items (has the actual videos) */
body.mindful-m-related ytm-item-section-renderer.scwnr-content[section-identifier=related-items] {
    position: fixed !important; top: 0 !important; left: 0 !important;
    right: 0 !important; bottom: 0 !important;
    width: 100% !important; height: 100% !important;
    overflow-y: auto !important; -webkit-overflow-scrolling: touch !important;
    background: var(--bg) !important;
    z-index: 100002 !important;
    display: block !important; visibility: visible !important;
    padding: 48px 0 56px !important;
}

/* Show action bar inside details panel */
body.mindful-m-details ytm-slim-video-action-bar-renderer {
    display: flex !important;
}
body.mindful-m-details ytm-slim-video-action-bar-renderer .slim-video-action-bar-actions {
    display: flex !important; gap: 6px !important; padding: 10px 14px !important;
}
body.mindful-m-details .slim_video_action_bar_renderer_button button,
body.mindful-m-details .ytSegmentedLikeDislikeButtonViewModelSegmentedButtonsWrapper button {
    color: var(--fg-dim) !important; background: var(--bg-hover) !important;
}
body.mindful-m-details .ytSegmentedLikeDislikeButtonViewModelSegmentedButtonsWrapper {
    background: var(--bg-hover) !important;
}

/* Show related videos */
body.mindful-m-related ytm-item-section-renderer.scwnr-content[section-identifier=related-items] {
    height: 100% !important; opacity: 1 !important;
    pointer-events: auto !important; overflow-y: auto !important;
}
body.mindful-m-related ytm-video-with-context-renderer {
    background: var(--bg) !important; display: block !important;
    border-bottom: 1px solid var(--border) !important;
    padding: 0 !important; margin: 0 !important;
}
body.mindful-m-related ytm-video-with-context-renderer .details { padding: 6px 10px !important; }
body.mindful-m-related ytm-video-with-context-renderer .media-item-headline {
    font-size: 12px !important; line-height: 1.3 !important;
}

/* ── Close button for panels ── */
#mindful-panel-close {
    position: fixed; top: 8px; right: 12px; z-index: 100003;
    display: none; background: var(--bg-dark); border: 1px solid var(--border);
    color: var(--fg); font-size: 18px; width: 36px; height: 36px;
    cursor: pointer; font-family: monospace;
    -webkit-tap-highlight-color: transparent;
}
body.mindful-m-details #mindful-panel-close,
body.mindful-m-related #mindful-panel-close { display: block !important; }
/* Also show close button when comments engagement panel is open */
body.mindful-m-comments-open #mindful-panel-close { display: block !important; }

/* ── Engagement panels (YouTube native) ── */
bottom-sheet-container { background: var(--bg-float) !important; }
.yt-spec-bottom-sheet-layout-content { background: var(--bg-float) !important; color: var(--fg) !important; }
/* Ensure engagement panel content is visible so IntersectionObserver fires */
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
/* Make the engagement panel close button clearly visible */
ytm-engagement-panel-header-renderer button,
.engagement-panel-title-header-renderer button {
    color: var(--fg) !important; opacity: 1 !important;
    min-width: 36px !important; min-height: 36px !important;
}
ytm-comment-thread-renderer { border-bottom: 1px solid var(--border) !important; }
.comment-text { color: var(--fg) !important; font-family: var(--mono) !important; font-size: 13px !important; }
.comment-title { color: var(--accent) !important; }
ytm-crawler-description { color: var(--fg-dim) !important; font-family: var(--mono) !important; font-size: 12px !important; line-height: 1.4 !important; }

/* ── Menus ── */
.menu-content, html[darker-dark-theme] .menu-content,
html[darker-dark-theme] .menu-full-width .menu-content { background: var(--bg-float) !important; color: var(--fg) !important; }
html[darker-dark-theme] .dialog { background: var(--bg-float) !important; }
.yt-spec-bottom-sheet-layout { background: var(--bg-float) !important; }

/* ── Search ── */
.mobile-topbar-header[data-mode=searching] { background-color: var(--bg-dark) !important; }
.searchbox-input { color: var(--fg) !important; background: var(--bg-float) !important; }
.search-bar { background: var(--bg-hover) !important; }
.searchbox-dropdown, .searchbox-dropdown .sbdd_b { background: var(--bg-dark) !important; color: var(--fg) !important; }

/* ── Links ── */
a, a:visited { color: var(--fg) !important; }

/* ── Channel pages ── */
ytm-c4-tabbed-header-renderer, .single-column-browse-results-tab-bar { background: var(--bg-dark) !important; color: var(--fg) !important; }

/* ── Subs/Library ── */
ytm-section-list-renderer, ytm-shelf-renderer, ytm-item-section-renderer { background: var(--bg) !important; }
ytm-compact-link-renderer { color: var(--fg) !important; }
.compact-link-icon { fill: var(--fg-dim) !important; }

/* ── Settings ── */
.setting-generic-category-title-block h2, .setting-title-subtitle-block h3 { color: var(--fg) !important; }

/* ── Buttons ── */
.yt-spec-button-shape-next--mono.yt-spec-button-shape-next--filled { background-color: var(--accent) !important; color: var(--bg) !important; }
html[darker-dark-theme] c3-toast { background: var(--bg-float) !important; color: var(--fg) !important; }

/* ── Our bottom bar ── */
#mindful-m-bar {
    position: fixed; bottom: 0; left: 0; right: 0;
    height: 52px; background: var(--bg-dark);
    border-top: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-around;
    z-index: 100000; padding: 0 4px;
}
#mindful-m-bar button {
    flex: 1; max-width: 72px; height: 44px; border: none; background: transparent;
    color: var(--fg-dim); cursor: pointer;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 2px; font-size: 9px; font-family: monospace;
    -webkit-tap-highlight-color: transparent;
}
#mindful-m-bar button.active { color: var(--accent) !important; }
#mindful-m-bar button svg { pointer-events: none; }

/* ── Search overlay ── */
#mindful-m-search {
    position: fixed; inset: 0; background: rgba(0,0,0,0.92);
    z-index: 100001; display: none; align-items: flex-start;
    justify-content: center; padding-top: 12vh;
}
#mindful-m-search.open { display: flex !important; }
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

    const ready = fn => document.body ? fn() : document.addEventListener("DOMContentLoaded", fn, { once: true });

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

        // ── Panel close button ──
        const panelClose = document.createElement("button");
        panelClose.id = "mindful-panel-close";
        panelClose.textContent = "✕";
        panelClose.addEventListener("click", closePanel);
        document.body.appendChild(panelClose);

        const PANELS = ["mindful-m-details", "mindful-m-related"];
        function closePanel() {
            PANELS.forEach(c => document.body.classList.remove(c));
            if (document.body.classList.contains("mindful-m-comments-open")) closeComments();
            updateWatchBtns();
        }
        function togglePanel(cls) {
            const wasOpen = document.body.classList.contains(cls);
            closePanel();
            if (!wasOpen) document.body.classList.add(cls);
            updateWatchBtns();
        }
        function openComments() {
            const vid = document.querySelector("video");
            const wasPlaying = vid && !vid.paused;
            const entry = document.querySelector("yt-video-metadata-carousel-view-model, comments-entry-point-teaser-view-model, ytm-comments-entry-point-header-renderer");
            if (entry) entry.click();
            document.body.classList.add("mindful-m-comments-open");
            if (wasPlaying && vid) {
                const resume = () => { if (vid.paused) vid.play(); vid.muted = false; };
                for (let t of [300, 600, 1000, 2000, 3000]) setTimeout(resume, t);
            }
        }
        function closeComments() {
            // Click YouTube's native close button in the engagement panel
            const closeBtn = document.querySelector('[panel-identifier="engagement-panel-comments-section"] button[aria-label*="Close"], ytm-engagement-panel-header-renderer button');
            if (closeBtn) closeBtn.click();
            document.body.classList.remove("mindful-m-comments-open");
        }

        let watchBtns = {};
        function updateWatchBtns() {
            Object.entries(watchBtns).forEach(([id, btn]) => {
                btn.classList.toggle("active", document.body.classList.contains(id));
            });
        }

        // ── Watch page button row + description ──
        function setupWatchUI() {
            if (location.pathname !== "/watch") return;
            const meta = document.querySelector("ytm-slim-video-metadata-section-renderer");
            if (!meta || document.getElementById("mindful-watch-btns")) return;

            const row = document.createElement("div");
            row.id = "mindful-watch-btns";
            watchBtns = {};
            const WATCH_ICONS = {
                details: "M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
                comments: "M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z",
                related: "M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z",
            };
            [
                { id:"mindful-m-details",  label:"Details",  icon:"details",  action: () => togglePanel("mindful-m-details") },
                { id:"mindful-m-comments", label:"Comments", icon:"comments", action: openComments },
                { id:"mindful-m-related",  label:"Related",  icon:"related",  action: () => togglePanel("mindful-m-related") },
            ].forEach(item => {
                const b = document.createElement("button");
                b.appendChild(ico(WATCH_ICONS[item.icon], 18));
                const lbl = document.createElement("span");
                lbl.textContent = item.label;
                b.appendChild(lbl);
                b.addEventListener("click", item.action);
                row.appendChild(b);
                watchBtns[item.id] = b;
            });
            meta.after(row);

            // Description / chapters below buttons
            const desc = document.querySelector("ytm-crawler-description");
            if (desc && !document.getElementById("mindful-watch-desc")) {
                const box = document.createElement("div");
                box.id = "mindful-watch-desc";
                const text = desc.textContent || "";
                text.split("\n").forEach(line => {
                    const t = line.trim();
                    if (!t) return;
                    const ch = t.match(/^(\d+:\d+(?::\d+)?)\s+(.+)/);
                    if (ch) {
                        const span = document.createElement("span");
                        span.className = "chapter";
                        span.textContent = ch[1] + "  " + ch[2];
                        box.appendChild(span);
                    } else {
                        const p = document.createElement("div");
                        p.textContent = t;
                        p.style.marginBottom = "4px";
                        box.appendChild(p);
                    }
                });
                row.after(box);
            }
        }

        // ── SPA nav ──
        let lastUrl = location.href;
        new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                if (searchEl.classList.contains("open")) closeSearch();
                closePanel();
                updateBar();
            }
            setupWatchUI();
        }).observe(document.body, { childList:true, subtree:true });
        setupWatchUI();
    });
})();

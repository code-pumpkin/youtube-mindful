// ==UserScript==
// @name         YouTube Mindful Mobile
// @namespace    youtube-mindful-mobile
// @version      3.0.0
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

/* ── Hide YT bottom nav — we replace it ── */
ytm-pivot-bar-renderer { height: 0 !important; min-height: 0 !important; overflow: hidden !important; opacity: 0 !important; pointer-events: none !important; }

/* ── Bottom padding for our bar ── */
[has-pivot-bar=true] ytm-app { padding-bottom: 56px !important; }

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

/* ── Collapsible section headers ── */
.mindful-section-hdr {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; background: var(--bg-dark);
    border-bottom: 1px solid var(--border);
    cursor: pointer; -webkit-tap-highlight-color: transparent;
    font-family: monospace; font-size: 12px; color: var(--fg-dim);
    user-select: none;
}
.mindful-section-hdr .label { font-weight: 500; color: var(--fg); }
.mindful-section-hdr .count { color: var(--fg-dark); margin-left: 6px; }
.mindful-section-hdr .arrow { transition: transform 0.15s; font-size: 10px; }
.mindful-section-hdr.open .arrow { transform: rotate(90deg); }
.mindful-section-body { display: none; }
.mindful-section-body.open { display: block; }

/* ── Video title ── */
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
/* Views + date + hashtags */
.modern-panel-with-inline-badge-subtitle { margin-top: 4px !important; }
.modern-panel-with-inline-badge-subtitle .secondary-text,
.modern-panel-with-inline-badge-subtitle .ytAttributedStringHost {
    font-size: 11px !important; color: var(--fg-dim) !important;
    font-family: var(--mono) !important;
}
.slim-video-metadata-information-inline-badge { display: none !important; }
/* "...more" button */
.slim-video-information-show-more {
    background: none !important; border: none !important;
    color: var(--fg-dim) !important; font-family: var(--mono) !important;
    font-size: 11px !important; padding: 2px 0 !important;
}

/* ── Channel row ── */
ytm-slim-owner-renderer {
    background: var(--bg) !important;
    padding: 8px 14px !important;
    border-top: 1px solid var(--border) !important;
    border-bottom: 1px solid var(--border) !important;
    display: flex !important; align-items: center !important;
}
.slim-owner-icon-and-title { display: flex !important; align-items: center !important; gap: 10px !important; flex: 1 !important; }
.slim-owner-profile-icon { width: 32px !important; height: 32px !important; }
.slim-owner-profile-icon img { width: 32px !important; height: 32px !important; }
.slim-owner-channel-name {
    color: var(--fg) !important; font-family: var(--mono) !important;
    font-size: 13px !important; font-weight: 500 !important; margin: 0 !important;
}
.slim-owner-subtitle, .slim-owner-bylines div {
    color: var(--fg-dim) !important; font-family: var(--mono) !important;
    font-size: 11px !important;
}
/* Subscribe button */
.slim-owner-subscribe-button { margin-left: auto !important; }
.modern-subscribe-button button {
    background: var(--bg-sel) !important; color: var(--fg) !important;
    font-family: var(--mono) !important; font-size: 12px !important;
}

/* ── Action bar (like/dislike/share) ── */
ytm-slim-video-action-bar-renderer {
    background: var(--bg) !important;
    padding: 6px 10px !important;
    border-bottom: 1px solid var(--border) !important;
}
.slim-video-action-bar-actions {
    display: flex !important; align-items: center !important;
    gap: 6px !important; justify-content: flex-start !important;
}
.slim_video_action_bar_renderer_button button {
    color: var(--fg-dim) !important; background: var(--bg-hover) !important;
    font-family: var(--mono) !important; font-size: 12px !important;
    padding: 6px 12px !important;
}
/* Like/dislike segmented button */
.ytSegmentedLikeDislikeButtonViewModelSegmentedButtonsWrapper {
    background: var(--bg-hover) !important;
}
.ytSegmentedLikeDislikeButtonViewModelSegmentedButtonsWrapper button {
    color: var(--fg-dim) !important; background: transparent !important;
}

/* ── Comments teaser carousel ── */
.scwnr-content { background: var(--bg) !important; padding: 0 !important; }
yt-video-metadata-carousel-view-model {
    background: var(--bg) !important; padding: 10px 14px !important;
    border-bottom: 1px solid var(--border) !important;
}
.ytVideoMetadataCarouselViewModelTitleSection { margin-bottom: 8px !important; }
.ytCarouselTitleViewModelTitle {
    color: var(--fg) !important; font-family: var(--mono) !important;
    font-size: 13px !important; font-weight: 500 !important;
}
.ytCarouselTitleViewModelSubtitle {
    color: var(--fg-dim) !important; font-family: var(--mono) !important;
    font-size: 11px !important; margin-left: 6px !important;
}
/* Comment preview text */
.ytCommentsEntryPointTeaserViewModelTeaser {
    color: var(--fg-dim) !important; font-family: var(--mono) !important;
    font-size: 12px !important; line-height: 1.3 !important;
}
/* Carousel dots */
.ytCarouselDotsShapeDot { background: var(--fg-dark) !important; }
.ytCarouselDotsShapeDotActive { background: var(--accent) !important; }

/* ── Related videos ── */
[section-identifier=related-items] { padding: 0 !important; }
/* Hide related chips bar */
ytm-related-chip-cloud-renderer { display: none !important; }
ytm-video-with-context-renderer {
    background: var(--bg) !important;
    border-bottom: 1px solid var(--border) !important;
    padding: 0 !important; margin: 0 !important;
}
ytm-video-with-context-renderer .details { padding: 6px 10px !important; }
ytm-video-with-context-renderer .media-item-headline {
    font-size: 12px !important; line-height: 1.3 !important;
}

/* ── Engagement panels (comments full view, description) ── */
bottom-sheet-container { background: var(--bg-float) !important; }
.yt-spec-bottom-sheet-layout-content { background: var(--bg-float) !important; color: var(--fg) !important; }
ytm-comment-thread-renderer { border-bottom: 1px solid var(--border) !important; }
.comment-text { color: var(--fg) !important; font-family: var(--mono) !important; font-size: 13px !important; }
.comment-title { color: var(--accent) !important; }
/* Description panel */
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

        // ── Collapsible watch page sections ──
        function wrapSection(el, label, startOpen) {
            if (!el || el.dataset.mindfulWrapped) return;
            el.dataset.mindfulWrapped = "1";
            const hdr = document.createElement("div");
            hdr.className = "mindful-section-hdr" + (startOpen ? " open" : "");
            hdr.innerHTML = '<span class="label">' + label + '</span><span class="arrow">▶</span>';
            el.style.display = startOpen ? "" : "none";
            el.parentNode.insertBefore(hdr, el);
            hdr.addEventListener("click", () => {
                const open = el.style.display !== "none";
                el.style.display = open ? "none" : "";
                hdr.classList.toggle("open", !open);
            });
        }

        function setupWatchSections() {
            const meta = document.querySelector("ytm-slim-video-metadata-section-renderer");
            wrapSection(meta, "ℹ Info", true);
            const sections = document.querySelectorAll("ytm-item-section-renderer.scwnr-content");
            sections.forEach(s => {
                if (s.querySelector("yt-video-metadata-carousel-view-model, comments-entry-point-teaser-view-model")) {
                    wrapSection(s, "💬 Comments", false);
                } else if (s.getAttribute("section-identifier") === "related-items" && s.querySelector("ytm-video-with-context-renderer")) {
                    wrapSection(s, "▶ Related", false);
                }
            });
        }

        // ── SPA nav ──
        let lastUrl = location.href;
        new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                if (searchEl.classList.contains("open")) closeSearch();
                updateBar();
            }
            if (location.pathname === "/watch") setupWatchSections();
        }).observe(document.body, { childList:true, subtree:true });
        if (location.pathname === "/watch") setupWatchSections();
    });
})();

// ==UserScript==
// @name         YouTube Mindful Mobile
// @namespace    youtube-mindful-mobile
// @version      1.0.0
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

    // ── Anti-backoff: prevent YouTube fake buffering ──
    const realFetch = window.fetch;
    window.fetch = function(input, init) {
        if (init && init.body && typeof init.body === "string" && init.body.includes('"contentPlaybackContext":{')) {
            init.body = init.body.replace('"contentPlaybackContext":{', '"contentPlaybackContext":{"isInlinePlaybackNoAd":true,');
        }
        return realFetch.apply(this, arguments);
    };
    const realAssign = Object.assign;
    Object.assign = function() {
        const ret = realAssign.apply(this, arguments);
        if (arguments.length === 3 && ret && ret.body && typeof ret.body === "string" && ret.body.includes('"contentPlaybackContext":{')) {
            ret.body = ret.body.replace('"contentPlaybackContext":{', '"contentPlaybackContext":{"isInlinePlaybackNoAd":true,');
        }
        return ret;
    };

    // ── Inject CSS ──
    const CSS = `
:root {
    --bg: #101010; --bg-dark: #0a0a0a; --bg-float: #181818;
    --bg-hover: #252525; --bg-sel: #2a2a2a;
    --fg: #e8e2d6; --fg-dim: #8a8a8a; --fg-dark: #4a4a4a;
    --border: #2a2a2a;
    --accent: #c8c0b0; --cyan: #90b0c8; --magenta: #b8a0d0;
}
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
    --yt-spec-10-percent-layer: var(--bg-hover) !important;
}
*, *::after, *::before { border-radius: 0 !important; }

/* Header */
ytm-mobile-topbar-renderer, ytm-header, #header,
#header-bar, .mobile-topbar-header {
    background-color: var(--bg-dark) !important;
    box-shadow: none !important;
}
html[darker-dark-theme] ytm-mobile-topbar-renderer { background-color: var(--bg-dark) !important; }
.mobile-topbar-header-content, .mobile-topbar-title { color: var(--fg) !important; }
ytm-mobile-topbar-renderer c3-icon { color: var(--fg-dim) !important; }

/* Bottom nav */
ytm-pivot-bar-renderer {
    background-color: var(--bg-dark) !important;
    border-top: 1px solid var(--border) !important;
    box-shadow: none !important;
}
html[darker-dark-theme] ytm-pivot-bar-renderer { background-color: var(--bg-dark) !important; }
ytm-pivot-bar-renderer c3-icon { color: var(--fg-dim) !important; }
.pivot-bar-item-title { color: var(--fg-dim) !important; font-size: 10px !important; }
ytm-pivot-bar-item-renderer .pivot-bar-item-tab[aria-selected=true] c3-icon,
ytm-pivot-bar-item-renderer .pivot-bar-item-tab[aria-selected=true] .pivot-bar-item-title {
    color: var(--accent) !important;
}

/* Chips */
ytm-feed-filter-chip-bar-renderer, .chip-bar { background-color: var(--bg) !important; }
ytm-chip-cloud-chip-renderer {
    background-color: var(--bg-sel) !important;
    color: var(--fg-dim) !important;
    border: 1px solid var(--border) !important;
}
ytm-chip-cloud-chip-renderer[selected] {
    background-color: var(--fg) !important;
    color: var(--bg) !important;
}

/* Hide shorts + ads */
ytm-reel-shelf-renderer, ytm-reel-item-renderer,
a[href*="/shorts/"],
ytm-promoted-sparkles-web-renderer,
ytm-companion-ad-renderer,
ytm-statement-banner-renderer { display: none !important; }

/* Home grid */
.rich-grid-renderer-contents {
    display: flex !important; flex-wrap: wrap !important;
    gap: 0 !important; padding: 0 !important; margin: 0 !important;
}
ytm-rich-item-renderer { width: 100% !important; display: block !important; margin: 0 !important; }
ytm-media-item[use-vertical-layout] {
    padding: 0 !important; margin: 0 0 2px 0 !important;
    border-bottom: 1px solid var(--border) !important;
}
ytm-rich-section-renderer, ytm-rich-grid-renderer { margin: 0 !important; }

/* Titles */
.media-item-headline { font-size: 13px !important; color: var(--fg) !important; line-height: 1.4 !important; font-weight: 400 !important; }
.media-item-metadata, .media-item-info, ytm-badge-and-byline-renderer { font-size: 11px !important; color: var(--fg-dim) !important; }
.media-channel { font-size: 11px !important; color: var(--fg-dim) !important; }
ytm-media-item .details { padding: 8px 12px !important; }

/* Watch page */
.player-container { background: #000 !important; }
.watch-main-col { background: var(--bg) !important; }
ytm-slim-video-information-renderer {
    background: var(--bg-float) !important; color: var(--fg) !important;
    border-bottom: 1px solid var(--border) !important;
}
.slim-video-information-title { font-size: 15px !important; color: var(--fg) !important; }
ytm-slim-video-action-bar-renderer {
    background: var(--bg-float) !important;
    border-bottom: 1px solid var(--border) !important;
}
.slim-video-action-bar-actions button { color: var(--fg-dim) !important; }
ytm-slim-video-metadata-section-renderer ytm-slim-owner-renderer {
    background: var(--bg-float) !important;
    border-bottom: 1px solid var(--border) !important;
}
.slim-owner-channel-name { color: var(--fg) !important; }
.slim-owner-bylines { color: var(--fg-dim) !important; }
.yt-spec-button-shape-next--mono.yt-spec-button-shape-next--filled {
    background-color: var(--accent) !important; color: var(--bg) !important;
}
ytm-single-column-watch-next-results-renderer { background: var(--bg) !important; }
ytm-video-with-context-renderer {
    background: var(--bg) !important;
    border-bottom: 1px solid var(--border) !important;
}
ytm-comments-entry-point-header-renderer {
    background: var(--bg-float) !important; color: var(--fg) !important;
    border-bottom: 1px solid var(--border) !important;
}

/* Engagement panels */
.engagement-panel-container { background: var(--bg-float) !important; color: var(--fg) !important; }
.engagement-panel-section-list-header {
    background: var(--bg-dark) !important; color: var(--fg) !important;
    border-bottom: 1px solid var(--border) !important;
}
ytm-comment-thread-renderer { border-bottom: 1px solid var(--border) !important; }
.comment-text { color: var(--fg) !important; }
.comment-title { color: var(--accent) !important; }
.comment-published-time { color: var(--fg-dark) !important; }

/* Menus */
.menu-content { background: var(--bg-float) !important; color: var(--fg) !important; }
html[darker-dark-theme] .menu-content,
html[darker-dark-theme] .menu-full-width .menu-content { background: var(--bg-float) !important; }
html[darker-dark-theme] .dialog { background: var(--bg-float) !important; }
.menu-item-button { color: var(--fg) !important; }
.yt-spec-bottom-sheet-layout { background: var(--bg-float) !important; }

/* Search */
.mobile-topbar-header[data-mode=searching] { background-color: var(--bg-dark) !important; }
.searchbox-input { color: var(--fg) !important; background: var(--bg-float) !important; }
.search-bar { background: var(--bg-hover) !important; }
.search-bar-text { color: var(--fg) !important; }
.searchbox-dropdown, .searchbox-dropdown .sbdd_b { background: var(--bg-dark) !important; color: var(--fg) !important; }

/* Links */
a, a:visited { color: var(--fg) !important; }
a:hover { color: var(--accent) !important; }

/* Scrollbar */
::-webkit-scrollbar { width: 4px !important; }
::-webkit-scrollbar-track { background: var(--bg-dark) !important; }
::-webkit-scrollbar-thumb { background: var(--fg-dark) !important; }

/* Channel pages */
ytm-c4-tabbed-header-renderer, .single-column-browse-results-tab-bar {
    background: var(--bg-dark) !important; color: var(--fg) !important;
}
.single-column-browse-results-tabs { color: var(--fg) !important; }

/* Subs / Library */
ytm-section-list-renderer, ytm-shelf-renderer, ytm-item-section-renderer { background: var(--bg) !important; }
ytm-compact-link-renderer { color: var(--fg) !important; }
.compact-link-icon { fill: var(--fg-dim) !important; }
ytm-channel-list-sub-menu-renderer { background: var(--bg) !important; border-bottom: 1px solid var(--border) !important; }

/* Settings */
.setting-generic-category-title-block h2 { color: var(--fg) !important; }
.setting-title-subtitle-block h3 { color: var(--fg) !important; }
.setting-title-subtitle-block { color: var(--fg-dim) !important; }

/* Toast */
html[darker-dark-theme] c3-toast { background: var(--bg-float) !important; color: var(--fg) !important; }

/* Buttons */
.yt-spec-button-shape-next--call-to-action.yt-spec-button-shape-next--text { color: var(--cyan) !important; }

/* ── Our bottom panel bar ── */
#mindful-m-panels {
    position: fixed; bottom: 0; left: 0; right: 0; height: 40px;
    background: var(--bg-dark); border-top: 1px solid var(--border);
    display: none; justify-content: space-around; align-items: center;
    z-index: 100000; font-family: monospace;
}
body.mindful-m-watch #mindful-m-panels { display: flex !important; }
body.mindful-m-watch ytm-pivot-bar-renderer { display: none !important; }
body.mindful-m-watch [has-pivot-bar=true] ytm-app { padding-bottom: 40px !important; }

/* Panel bottom sheets */
.mindful-m-sheet {
    position: fixed; left: 0; right: 0; bottom: 40px;
    height: 60vh; max-height: 60vh;
    background: var(--bg-float);
    overflow-y: auto; overflow-x: hidden;
    z-index: 99999;
    border-top: 2px solid var(--border);
    display: none;
}
.mindful-m-sheet.open { display: block !important; }
.mindful-m-sheet.mindful-m-recs { border-top-color: var(--cyan); }
.mindful-m-sheet.mindful-m-comments { border-top-color: var(--magenta); }
.mindful-m-sheet.mindful-m-info { border-top-color: var(--accent); }
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

    // ── Wait for body ──
    const ready = fn => document.body ? fn() : document.addEventListener("DOMContentLoaded", fn, { once: true });

    ready(() => {

            // TEMP: dump DOM after 8 seconds
            setTimeout(() => {
                const clone = document.documentElement.cloneNode(true);
                clone.querySelectorAll("img,video,source,script,link[rel=preload]").forEach(el => { el.removeAttribute("src"); el.removeAttribute("srcset"); });
                clone.querySelectorAll("style").forEach(el => el.textContent = "");
                const html = clone.outerHTML;
                const blob = new Blob([html], {type:"text/html"});
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = location.pathname === "/watch" ? "yt-watch.html" : "yt-home.html";
                document.body.appendChild(a); a.click(); a.remove();
            }, 8000);

        const isWatch = () => location.pathname === "/watch";

        // ── SVG helper ──
        function ico(d, size) {
            const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
            svg.setAttribute("viewBox","0 0 24 24");
            svg.setAttribute("width", size || "20"); svg.setAttribute("height", size || "20");
            svg.style.pointerEvents = "none";
            const p = document.createElementNS("http://www.w3.org/2000/svg","path");
            p.setAttribute("d", d); p.setAttribute("fill","currentColor");
            svg.appendChild(p); return svg;
        }

        // ── Watch page panel bar ──
        const panelBar = document.createElement("div");
        panelBar.id = "mindful-m-panels";

        let openPanel = null;
        const sheets = {};

        const panels = [
            { id:"recs", label:"Related", color:C.cyan, icon:"M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" },
            { id:"comments", label:"Comments", color:C.magenta, icon:"M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z" },
            { id:"info", label:"Info", color:C.accent, icon:"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" },
        ];

        panels.forEach(p => {
            // Create bottom sheet
            const sheet = document.createElement("div");
            sheet.className = `mindful-m-sheet mindful-m-${p.id}`;
            sheets[p.id] = sheet;
            document.body.appendChild(sheet);

            // Create button
            const btn = document.createElement("button");
            Object.assign(btn.style, {
                flex:"1", height:"40px", border:"none", background:"transparent",
                color:C.fgDim, cursor:"pointer", display:"flex", alignItems:"center",
                justifyContent:"center", gap:"4px", fontSize:"11px", fontFamily:"monospace",
                borderBottom:"2px solid transparent", transition:"all 0.15s",
            });
            btn.appendChild(ico(p.icon, "16"));
            const lbl = document.createElement("span"); lbl.textContent = p.label;
            btn.appendChild(lbl);

            btn.addEventListener("click", () => {
                if (openPanel === p.id) {
                    // Close
                    sheet.classList.remove("open");
                    btn.style.color = C.fgDim;
                    btn.style.borderBottomColor = "transparent";
                    openPanel = null;
                } else {
                    // Close any open
                    panels.forEach(pp => {
                        sheets[pp.id].classList.remove("open");
                        panelBar.querySelectorAll("button").forEach(b => {
                            b.style.color = C.fgDim;
                            b.style.borderBottomColor = "transparent";
                        });
                    });
                    // Open this one and populate
                    populateSheet(p.id);
                    sheet.classList.add("open");
                    btn.style.color = p.color;
                    btn.style.borderBottomColor = p.color;
                    openPanel = p.id;
                }
            });
            panelBar.appendChild(btn);
        });

        document.body.appendChild(panelBar);

        // ── Populate sheets by cloning YouTube's content ──
        function populateSheet(id) {
            const sheet = sheets[id];
            while (sheet.firstChild) sheet.removeChild(sheet.firstChild);

            if (id === "recs") {
                const src = document.querySelector("[section-identifier=related-items]");
                if (src) { const clone = src.cloneNode(true); sheet.appendChild(clone); }
                else { sheet.textContent = "No recommendations found"; sheet.style.padding = "20px"; }
            }
            else if (id === "comments") {
                // Tap YouTube's comments entry point to open their panel
                const entry = document.querySelector("ytm-comments-entry-point-header-renderer");
                if (entry) {
                    entry.click();
                    sheet.classList.remove("open");
                    openPanel = null;
                    // Reset button styles
                    panelBar.querySelectorAll("button").forEach(b => {
                        b.style.color = C.fgDim;
                        b.style.borderBottomColor = "transparent";
                    });
                    return;
                }
                sheet.textContent = "No comments found"; sheet.style.padding = "20px";
            }
            else if (id === "info") {
                const title = document.querySelector(".slim-video-information-title");
                const owner = document.querySelector("ytm-slim-owner-renderer");
                const desc = document.querySelector("ytm-slim-video-information-renderer");
                if (desc) { const clone = desc.cloneNode(true); sheet.appendChild(clone); }
                if (owner) { const clone = owner.cloneNode(true); sheet.appendChild(clone); }
                if (!desc && !owner) { sheet.textContent = "No info available"; sheet.style.padding = "20px"; }
            }
        }

        // ── Search overlay ──
        let searchEl, searchInput, suggestEl, suggestTimer;
        function buildSearch() {
            searchEl = document.createElement("div");
            Object.assign(searchEl.style, {
                position:"fixed", inset:"0", background:"rgba(0,0,0,0.88)",
                zIndex:"100001", display:"none", alignItems:"flex-start",
                justifyContent:"center", paddingTop:"10vh",
            });
            const wrap = document.createElement("div");
            Object.assign(wrap.style, { display:"flex", flexDirection:"column", width:"92%" });

            searchInput = document.createElement("input");
            searchInput.type = "text"; searchInput.placeholder = "search youtube...";
            Object.assign(searchInput.style, {
                width:"100%", background:C.bgDark, border:"none",
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
                    const s = suggestEl.querySelector(".sel");
                    const q = s ? s.dataset.q : searchInput.value.trim();
                    if (q) location.href = `/results?search_query=${encodeURIComponent(q)}`;
                    closeSearch();
                } else if (e.key === "Escape") { closeSearch(); }
            });
            searchInput.addEventListener("input", () => {
                clearTimeout(suggestTimer);
                suggestTimer = setTimeout(() => fetchSuggest(searchInput.value.trim()), 200);
            });

            wrap.append(searchInput, suggestEl);
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
                        try {
                            const d = JSON.parse(res.responseText);
                            if (d && d[1]) renderSuggest(d[1], q);
                        } catch(e) {}
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

        function openSearch() { searchEl.style.display = "flex"; searchInput.value = ""; searchInput.focus(); }
        function closeSearch() { searchEl.style.display = "none"; while(suggestEl.firstChild) suggestEl.removeChild(suggestEl.firstChild); suggestEl.style.display = "none"; }

        buildSearch();

        // ── Bottom nav bar (non-watch pages) ──
        const nav = document.createElement("div");
        nav.id = "mindful-m-nav";
        Object.assign(nav.style, {
            position:"fixed", bottom:"0", left:"0", right:"0", height:"48px",
            background:C.bgDark, borderTop:`1px solid ${C.border}`,
            display:"none", justifyContent:"space-around", alignItems:"center",
            zIndex:"99998",
        });

        const navBtns = [
            { label:"Home", icon:"M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z", action:()=>location.href="/" },
            { label:"Search", icon:"M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z", action:openSearch },
            { label:"Subs", icon:"M18 1H6a2 2 0 00-2 2h16a2 2 0 00-2-2zm3 4H3a2 2 0 00-2 2v13a2 2 0 002 2h18a2 2 0 002-2V7a2 2 0 00-2-2zM3 20V7h18v13H3zm13-6.5L10 10v7l6-3.5z", action:()=>location.href="/feed/subscriptions" },
            { label:"History", icon:"M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7a6.98 6.98 0 01-4.95-2.05l-1.41 1.41A8.96 8.96 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z", action:()=>location.href="/feed/history" },
        ];
        navBtns.forEach(b => {
            const btn = document.createElement("button");
            Object.assign(btn.style, { width:"44px", height:"44px", border:"none", background:"transparent", color:C.fgDim, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" });
            btn.appendChild(ico(b.icon, "22"));
            btn.addEventListener("click", e => { e.preventDefault(); b.action(); });
            nav.appendChild(btn);
        });
        document.body.appendChild(nav);

        // ── Toggle watch vs browse mode ──
        function updateMode() {
            const w = isWatch();
            document.body.classList.toggle("mindful-m-watch", w);
            nav.style.display = w ? "none" : "flex";
            // Close panels on nav
            if (!w && openPanel) {
                panels.forEach(p => sheets[p.id].classList.remove("open"));
                openPanel = null;
            }
        }

        // ── SPA nav detection ──
        let lastUrl = location.href;
        new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                updateMode();
                // Remove old panel content
                panels.forEach(p => { while(sheets[p.id].firstChild) sheets[p.id].removeChild(sheets[p.id].firstChild); });
            }
        }).observe(document.body, { childList:true, subtree:true });

        updateMode();
    });
})();

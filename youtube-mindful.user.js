// ==UserScript==
// @name         YouTube Mindful v8
// @namespace    youtube-mindful
// @version      8.0.0
// @description  Mindful YouTube — sidebar nav, side panels, responsive.
// @author       codePumpkin
// @match        https://www.youtube.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const C = {
        bgDark:"#080a0e", bgFloat:"#0f1318", border:"#2a3040", bgHover:"#1a2030",
        fg:"#e8e3da", fgDim:"#7a8394", fgDark:"#3d4452",
        accent:"#e6b450", green:"#7fd962", red:"#d95757",
        yellow:"#ffb454", cyan:"#73b8ff", magenta:"#d2a6ff",
    };

    const PANELS = ["details","recs","comments","chat"];
    const PANEL_COLORS = { details:C.accent, recs:C.cyan, comments:C.magenta, chat:C.magenta };
    const PANEL_LABELS = { details:"Details", recs:"Recommendations", comments:"Comments", chat:"Live Chat" };
    const PANEL_ICONS = { details:"ℹ", recs:"▤", comments:"💬", chat:"◉" };

    let state = { panel: null };

    const isWatch  = () => location.pathname === "/watch";
    const isLive   = () => !!document.querySelector("ytd-live-chat-frame#chat, .ytp-live-badge[disabled], .ytp-live");
    const isPhone  = () => window.innerWidth <= 600;

    function isTyping() {
        const a = document.activeElement;
        if (!a) return false;
        const t = a.tagName.toLowerCase();
        return t === "input" || t === "textarea" || a.isContentEditable;
    }

    function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

    function forceTheater() {
        if (!isWatch()) return;
        const f = document.querySelector("ytd-watch-flexy");
        if (!f || f.hasAttribute("theater") || f.hasAttribute("fullscreen")) return;
        const b = document.querySelector(".ytp-size-button");
        if (b) b.click(); else f.setAttribute("theater", "");
    }

    // ── Stats injection for details panel ──
    function injectStats(container) {
        container.querySelectorAll("#mindful-stats, #mindful-title-inject").forEach(e => e.remove());
        const get = s => document.querySelector(s)?.textContent?.trim() || "";
        const title = get("ytd-watch-flexy h1.ytd-watch-metadata yt-formatted-string")
                   || get("ytd-watch-flexy #title h1 yt-formatted-string") || get("ytd-watch-flexy #title");
        const channel = get("ytd-watch-flexy ytd-channel-name a") || get("ytd-watch-flexy #channel-name a");
        const info = get("ytd-watch-flexy #info-container yt-formatted-string#info");
        let likes = "";
        const lb = document.querySelector("ytd-watch-flexy like-button-view-model button, ytd-watch-flexy button[aria-label*='like' i]");
        if (lb) { const m = (lb.getAttribute("aria-label") || "").match(/([\d,]+)/); likes = m ? m[1] : ""; }

        if (title) {
            const el = document.createElement("div"); el.id = "mindful-title-inject";
            el.innerHTML = `<div style="font-size:14px;font-weight:bold;color:${C.fg};margin-bottom:4px">${esc(title)}</div>${channel ? `<div style="font-size:11px;color:${C.cyan}">${esc(channel)}</div>` : ""}`;
            container.prepend(el);
        }
        const bar = document.createElement("div"); bar.id = "mindful-stats";
        const p = [];
        if (info) p.push(`<span style="color:${C.cyan}">${esc(info)}</span>`);
        if (likes) p.push(`<span style="color:${C.green}">${esc(likes)} likes</span>`);
        if (!p.length) p.push(`<span style="color:${C.fgDim}">stats unavailable</span>`);
        bar.innerHTML = p.join(`<span style="color:${C.fgDark}"> · </span>`);
        const ref = container.querySelector("#mindful-title-inject");
        if (ref) ref.after(bar); else container.prepend(bar);
    }

    // ── Side panel ──
    let panel, panelHeader, panelTitle, panelBody;

    // Sources: where to grab content from YT DOM and put into our panel
    const PANEL_SOURCES = {
        details:  () => {
            // Clone the above-the-fold section, make it visible
            const src = document.querySelector("ytd-watch-flexy #above-the-fold");
            if (!src) return null;
            const clone = src.cloneNode(true);
            clone.style.cssText = "display:block!important;visibility:visible!important;position:static!important;padding:12px!important;font-family:var(--mono)!important;font-size:12px!important;color:var(--fg)!important;";
            // Unhide children
            clone.querySelectorAll("#top-row,#bottom-row,#description,#description-inner,ytd-text-inline-expander,#snippet,#plain-snippet-text,ytd-watch-metadata,ytd-structured-description-content-renderer,#attributed-snippet-text").forEach(el => {
                el.style.cssText = "display:block!important;visibility:visible!important;position:static!important;max-height:none!important;overflow:visible!important;height:auto!important;";
            });
            clone.querySelectorAll("#expand,#collapse,[slot='expand-button'],[slot='collapse-button']").forEach(el => el.remove());
            clone.querySelectorAll("#bottom-row > *:not(#description)").forEach(el => el.remove());
            setTimeout(() => injectStats(clone), 50);
            return clone;
        },
        comments: () => {
            const src = document.querySelector("ytd-watch-flexy ytd-comments#comments, ytd-watch-flexy #comments");
            if (!src) return null;
            const clone = src.cloneNode(true);
            clone.style.cssText = "display:block!important;visibility:visible!important;position:static!important;left:auto!important;width:100%!important;pointer-events:auto!important;";
            return clone;
        },
        recs: () => {
            const src = document.querySelector("ytd-watch-flexy #secondary-inner");
            if (!src) return null;
            const clone = src.cloneNode(true);
            clone.style.cssText = "display:block!important;visibility:visible!important;position:static!important;left:auto!important;width:100%!important;max-width:100%!important;pointer-events:auto!important;overflow:visible!important;opacity:1!important;clip:auto!important;clip-path:none!important;";
            clone.querySelectorAll("ytd-watch-next-secondary-results-renderer").forEach(el => {
                el.style.cssText = "display:block!important;visibility:visible!important;position:static!important;width:100%!important;max-width:100%!important;overflow:visible!important;opacity:1!important;";
            });
            return clone;
        },
        chat: () => {
            const src = document.querySelector("ytd-live-chat-frame#chat");
            if (!src) return null;
            const clone = src.cloneNode(true);
            clone.style.cssText = "display:block!important;visibility:visible!important;position:static!important;left:auto!important;width:100%!important;height:100%!important;pointer-events:auto!important;";
            clone.querySelectorAll("iframe").forEach(f => { f.style.cssText = "width:100%!important;height:100%!important;"; });
            return clone;
        },
    };

    function buildPanel() {
        panel = document.createElement("div"); panel.id = "mindful-panel";
        panelHeader = document.createElement("div"); panelHeader.id = "mindful-panel-header";
        panelTitle = document.createElement("span");
        const closeBtn = document.createElement("button"); closeBtn.textContent = "✕";
        closeBtn.addEventListener("click", closePanel);
        panelHeader.append(panelTitle, closeBtn);
        panelBody = document.createElement("div"); panelBody.id = "mindful-panel-body";
        panel.append(panelHeader, panelBody);
        document.body.appendChild(panel);
    }

    function openPanel(name) {
        if (state.panel === name) { closePanel(); return; }
        if (state.panel) closePanel();
        if (name === "chat" && !isLive()) return;

        const content = PANEL_SOURCES[name]();
        if (!content) return;

        panelBody.innerHTML = "";
        panelBody.appendChild(content);
        panelTitle.textContent = PANEL_LABELS[name];
        panelHeader.style.borderBottomColor = PANEL_COLORS[name];
        panel.classList.add("open");
        document.body.classList.add("mindful-panel-open");
        state.panel = name;
        updateSidebar();
    }

    function closePanel() {
        panel.classList.remove("open");
        document.body.classList.remove("mindful-panel-open");
        panelBody.innerHTML = "";
        state.panel = null;
        updateSidebar();
    }

    // ── Search overlay ──
    let searchEl, searchInput, suggestEl, suggestTimer;

    function buildSearch() {
        searchEl = document.createElement("div"); searchEl.id = "mindful-search";
        const wrap = document.createElement("div");
        wrap.style.cssText = "display:flex;flex-direction:column;width:55%;max-width:600px;";
        searchInput = document.createElement("input"); searchInput.type = "text"; searchInput.placeholder = "search...";
        suggestEl = document.createElement("div"); suggestEl.id = "mindful-suggest";

        searchInput.addEventListener("keydown", e => {
            e.stopImmediatePropagation();
            if (e.key === "Enter") {
                const s = suggestEl.querySelector(".sel");
                const q = s ? s.dataset.q : searchInput.value.trim();
                if (q) location.href = `/results?search_query=${encodeURIComponent(q)}`;
                closeSearch();
            } else if (e.key === "Escape") { e.preventDefault(); closeSearch(); }
            else if (e.key === "ArrowDown") { e.preventDefault(); moveSuggest(1); }
            else if (e.key === "ArrowUp") { e.preventDefault(); moveSuggest(-1); }
        });
        searchInput.addEventListener("input", () => {
            clearTimeout(suggestTimer);
            suggestTimer = setTimeout(() => fetchSuggest(searchInput.value.trim()), 150);
        });

        wrap.append(searchInput, suggestEl);
        searchEl.appendChild(wrap);
        searchEl.addEventListener("click", e => { if (e.target === searchEl) closeSearch(); });
        document.body.appendChild(searchEl);
    }

    function fetchSuggest(q) {
        if (!q) { suggestEl.style.display = "none"; return; }
        const cb = "_ys" + Date.now(), s = document.createElement("script");
        window[cb] = d => { delete window[cb]; s.remove(); if (d?.[1]) renderSuggest(d[1], q); };
        s.src = `https://suggestqueries-clients6.youtube.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(q)}&callback=${cb}`;
        document.head.appendChild(s);
        setTimeout(() => { if (window[cb]) { delete window[cb]; s.remove(); } }, 3000);
    }

    function renderSuggest(items, q) {
        suggestEl.innerHTML = "";
        if (!items.length) { suggestEl.style.display = "none"; return; }
        items.forEach(item => {
            const text = Array.isArray(item) ? item[0] : String(item);
            const div = document.createElement("div"); div.className = "item"; div.dataset.q = text;
            const lo = text.toLowerCase(), lq = q.toLowerCase(), mi = lo.indexOf(lq);
            div.innerHTML = mi >= 0 ? `${esc(text.slice(0,mi))}<span style="color:${C.accent};font-weight:bold">${esc(text.slice(mi,mi+q.length))}</span>${esc(text.slice(mi+q.length))}` : esc(text);
            div.addEventListener("click", () => { location.href = `/results?search_query=${encodeURIComponent(text)}`; closeSearch(); });
            suggestEl.appendChild(div);
        });
        suggestEl.style.display = "block";
    }

    function moveSuggest(dir) {
        const items = [...suggestEl.querySelectorAll(".item")]; if (!items.length) return;
        const cur = suggestEl.querySelector(".sel"); let idx = cur ? items.indexOf(cur) : -1;
        items.forEach(i => i.classList.remove("sel"));
        idx = (idx + dir + items.length) % items.length;
        items[idx].classList.add("sel"); items[idx].scrollIntoView({ block:"nearest" });
        searchInput.value = items[idx].dataset.q;
    }

    function openSearch() {
        if (state.panel) closePanel();
        searchEl.classList.add("open"); searchInput.value = ""; searchInput.focus();
    }
    function closeSearch() {
        searchEl.classList.remove("open"); searchInput.blur();
        suggestEl.innerHTML = ""; suggestEl.style.display = "none";
    }

    // ── Sidebar ──
    let sidebar;
    const sidebarBtns = {};

    function buildSidebar() {
        sidebar = document.createElement("div"); sidebar.id = "mindful-sidebar";

        const items = [
            { id:"home",   icon:"⌂", label:"Home",    action: () => { location.pathname === "/" ? null : (document.querySelector("a#logo,a[href='/']")?.click() || (location.href="/")); }},
            { id:"search", icon:"⌕", label:"Search",  action: openSearch },
            { id:"back",   icon:"←", label:"Back",    action: () => history.back() },
            "sep",
            { id:"details",  icon:"ℹ",  label:"Details",         action: () => isWatch() && openPanel("details") },
            { id:"recs",     icon:"▤",  label:"Recommendations", action: () => isWatch() && openPanel("recs") },
            { id:"comments", icon:"💬", label:"Comments",        action: () => isWatch() && openPanel("comments") },
            { id:"chat",     icon:"◉",  label:"Live Chat",      action: () => isWatch() && isLive() && openPanel("chat") },
        ];

        items.forEach(item => {
            if (item === "sep") { const s = document.createElement("div"); s.className = "sep"; sidebar.appendChild(s); return; }
            const b = document.createElement("button");
            b.setAttribute("aria-label", item.label);
            b.textContent = item.icon;
            b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); item.action(); });
            sidebar.appendChild(b);
            sidebarBtns[item.id] = b;
        });

        document.body.appendChild(sidebar);
        updateSidebar();
    }

    function updateSidebar() {
        const w = isWatch(), live = isLive();
        ["details","recs","comments"].forEach(id => { sidebarBtns[id].disabled = !w; });
        sidebarBtns.chat.disabled = !w || !live;
        PANELS.forEach(id => { sidebarBtns[id].classList.toggle("active", state.panel === id); });
    }

    // ── Keyboard — just Escape ──
    function onKey(e) {
        if (isTyping()) return;
        if (e.key === "Escape") {
            if (searchEl.classList.contains("open")) { closeSearch(); return; }
            if (state.panel) { closePanel(); return; }
        }
    }

    // ── SPA nav ──
    function onNav() {
        if (state.panel) closePanel();
        if (searchEl?.classList.contains("open")) closeSearch();
        updateSidebar();
        setTimeout(forceTheater, 800);
    }

    // ── Init ──
    function init() {
        buildPanel();
        buildSidebar();
        buildSearch();

        document.body.style.overscrollBehavior = "none";

        // Touch debounce
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
        window.addEventListener("yt-navigate-finish", onNav);

        document.addEventListener("fullscreenchange", () => {
            const fs = !!document.fullscreenElement;
            if (sidebar) sidebar.style.display = fs ? "none" : "";
            if (panel) panel.style.display = fs ? "none" : "";
        });

        let lastUrl = location.href;
        new MutationObserver(() => {
            if (location.href !== lastUrl) { lastUrl = location.href; onNav(); }
        }).observe(document.body, { childList:true, subtree:true });

        setTimeout(forceTheater, 1000);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();

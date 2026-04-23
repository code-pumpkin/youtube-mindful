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
        accent:"#e6b450", green:"#7fd962", cyan:"#73b8ff", magenta:"#d2a6ff",
    };

    const PANELS = ["details","recs","comments","chat"];
    const panelClasses = {
        details:"mindful-panel-details", recs:"mindful-panel-recs",
        comments:"mindful-panel-comments", chat:"mindful-panel-chat",
    };

    let state = { panelOpen: null };

    const isWatch = () => location.pathname === "/watch";
    const isLive  = () => !!document.querySelector("ytd-live-chat-frame#chat, .ytp-live-badge[disabled], .ytp-live");

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
            el.innerHTML = `<div style="font-size:14px;font-weight:bold;color:${C.fg};margin-bottom:4px">${esc(title)}</div>${channel ? `<div style="font-size:11px;color:${C.cyan}">${esc(channel)}</div>` : ""}`;
            container.insertBefore(el, container.firstChild);
        }
        const bar = document.createElement("div"); bar.id = "mindful-stats";
        const p = [];
        if (info) p.push(`<span style="color:${C.cyan}">${esc(info)}</span>`);
        if (likes) p.push(`<span style="color:${C.green}">${esc(likes)} likes</span>`);
        if (!p.length) p.push(`<span style="color:${C.fgDim}">stats unavailable</span>`);
        bar.innerHTML = p.join(`<span style="color:${C.fgDark}"> · </span>`);
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
            const div = document.createElement("div"); div.dataset.q = text;
            Object.assign(div.style, {
                padding:"8px 12px", cursor:"pointer",
                fontFamily:'"JetBrains Mono",monospace', fontSize:"13px",
                color:C.fg, borderBottom:`1px solid ${C.border}`,
            });
            const lo = text.toLowerCase(), lq = q.toLowerCase(), mi = lo.indexOf(lq);
            div.innerHTML = mi >= 0 ? `${esc(text.slice(0,mi))}<span style="color:${C.accent};font-weight:bold">${esc(text.slice(mi,mi+q.length))}</span>${esc(text.slice(mi+q.length))}` : esc(text);
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
    function closeSearch() { searchEl.classList.remove("open"); searchInput.blur(); suggestEl.innerHTML = ""; suggestEl.style.display = "none"; }

    // ── Settings ──
    const DEFAULTS = { panelMode: "side", panelWidth: 380 };
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
        settingsEl = document.createElement("div"); settingsEl.id = "mindful-settings";
        Object.assign(settingsEl.style, {
            position:"fixed", inset:"0", background:"rgba(0,0,0,0.88)",
            zIndex:"100002", display:"none", alignItems:"center", justifyContent:"center",
        });

        const box = document.createElement("div");
        Object.assign(box.style, {
            background:C.bgFloat, border:`1px solid ${C.border}`,
            padding:"20px 24px", width:"340px", maxWidth:"90vw",
            fontFamily:'"JetBrains Mono",monospace', fontSize:"12px", color:C.fg,
        });

        const title = document.createElement("div");
        Object.assign(title.style, { fontSize:"13px", color:C.accent, borderBottom:`1px solid ${C.border}`, paddingBottom:"8px", marginBottom:"16px", fontWeight:"bold" });
        title.textContent = "⚙ Mindful Settings";

        // Panel mode
        const modeRow = document.createElement("div");
        Object.assign(modeRow.style, { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px", color:C.fgDim, fontSize:"11px" });
        const modeLabel = document.createElement("span"); modeLabel.textContent = "Panel mode";
        const modeEl = document.createElement("select");
        Object.assign(modeEl.style, { background:C.bgDark, color:C.fg, border:`1px solid ${C.border}`, fontFamily:'"JetBrains Mono",monospace', fontSize:"11px", padding:"4px 6px" });
        modeEl.innerHTML = `<option value="side">Side panel</option><option value="overlay">Overlay</option>`;
        modeRow.append(modeLabel, modeEl);

        // Panel width
        const widthRow = document.createElement("div");
        Object.assign(widthRow.style, { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px", color:C.fgDim, fontSize:"11px" });
        const widthLabel = document.createElement("span"); widthLabel.textContent = "Panel width";
        const widthWrap = document.createElement("span");
        Object.assign(widthWrap.style, { display:"flex", alignItems:"center", gap:"8px" });
        const widthEl = document.createElement("input"); widthEl.type = "range"; widthEl.min = "280"; widthEl.max = "600"; widthEl.step = "10";
        Object.assign(widthEl.style, { width:"100px", accentColor:C.accent });
        const widthVal = document.createElement("span");
        Object.assign(widthVal.style, { color:C.accent, minWidth:"45px", textAlign:"right", fontSize:"11px" });
        widthWrap.append(widthEl, widthVal);
        widthRow.append(widthLabel, widthWrap);

        // Close button
        const closeBtn = document.createElement("button"); closeBtn.textContent = "Close";
        Object.assign(closeBtn.style, {
            display:"block", marginTop:"16px", width:"100%", padding:"6px",
            background:C.bgDark, color:C.fg, border:`1px solid ${C.border}`,
            fontFamily:'"JetBrains Mono",monospace', fontSize:"11px", cursor:"pointer", textAlign:"center",
        });

        box.append(title, modeRow, widthRow, closeBtn);
        settingsEl.appendChild(box);

        settingsEl.addEventListener("click", e => { if (e.target === settingsEl) closeSettings(); });
        closeBtn.addEventListener("click", closeSettings);
        modeEl.addEventListener("change", () => { prefs.panelMode = modeEl.value; savePrefs(); });
        widthEl.addEventListener("input", () => { prefs.panelWidth = +widthEl.value; widthVal.textContent = widthEl.value + "px"; savePrefs(); });

        settingsEl._modeEl = modeEl;
        settingsEl._widthEl = widthEl;
        settingsEl._widthVal = widthVal;
        document.body.appendChild(settingsEl);
    }

    function openSettings() {
        if (state.panelOpen) closePanel();
        settingsEl._modeEl.value = prefs.panelMode;
        settingsEl._widthEl.value = prefs.panelWidth;
        settingsEl._widthVal.textContent = prefs.panelWidth + "px";
        settingsEl.style.display = "flex";
    }
    function closeSettings() { settingsEl.style.display = "none"; }

    // ── Sidebar ──
    let sidebar;
    const sidebarBtns = {};

    function buildSidebar() {
        sidebar = document.createElement("div"); sidebar.id = "mindful-sidebar";
        const items = [
            { id:"home",   icon:"⌂", label:"Home",    action: () => { if (location.pathname !== "/") { const l = document.querySelector("a#logo,a[href='/']"); l ? l.click() : (location.href="/"); } }},
            { id:"search", icon:"⌕", label:"Search",  action: openSearch },
            { id:"back",   icon:"←", label:"Back",    action: () => history.back() },
            "sep",
            { id:"details",  icon:"ℹ",  label:"Details",         action: () => isWatch() && togglePanel("details") },
            { id:"recs",     icon:"▤",  label:"Recommendations", action: () => isWatch() && togglePanel("recs") },
            { id:"comments", icon:"💬", label:"Comments",        action: () => isWatch() && togglePanel("comments") },
            { id:"chat",     icon:"◉",  label:"Live Chat",      action: () => isWatch() && isLive() && togglePanel("chat") },
            "sep",
            { id:"settings", icon:"⚙",  label:"Settings",        action: openSettings },
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
        const w = isWatch();
        ["details","recs","comments"].forEach(id => { sidebarBtns[id].disabled = !w; });
        sidebarBtns.chat.disabled = !w || !isLive();
        PANELS.forEach(id => { sidebarBtns[id].classList.toggle("active", state.panelOpen === id); });
    }

    // ── Keyboard — just Escape ──
    function onKey(e) {
        if (isTyping()) return;
        if (e.key === "Escape") {
            if (settingsEl.style.display === "flex") { closeSettings(); return; }
            if (searchEl.classList.contains("open")) { closeSearch(); return; }
            if (state.panelOpen) { closePanel(); return; }
        }
    }

    // ── SPA nav ──
    function onNav() {
        if (state.panelOpen) closePanel();
        if (searchEl?.classList.contains("open")) closeSearch();
        updateSidebar();
        setTimeout(forceTheater, 800);
    }

    // ── Init ──
    function init() {
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
        window.addEventListener("yt-navigate-finish", onNav);
        document.addEventListener("fullscreenchange", () => {
            if (sidebar) sidebar.style.display = document.fullscreenElement ? "none" : "";
        });

        let lastUrl = location.href;
        new MutationObserver(() => {
            if (location.href !== lastUrl) { lastUrl = location.href; onNav(); }
        }).observe(document.body, { childList:true, subtree:true });

        setTimeout(forceTheater, 1000);
        setTimeout(updateSidebar, 500);
        setTimeout(updateSidebar, 2000);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();

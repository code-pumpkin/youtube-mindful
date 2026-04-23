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

    // Retry theater mode aggressively on watch pages
    function ensureTheater() {
        if (!isWatch()) return;
        forceTheater();
        let tries = 0;
        const iv = setInterval(() => {
            if (++tries > 10 || !isWatch()) { clearInterval(iv); return; }
            const f = document.querySelector("ytd-watch-flexy");
            if (f && f.hasAttribute("theater")) { clearInterval(iv); return; }
            forceTheater();
        }, 500);
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

        const S = `position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.88);z-index:100002;display:none;justify-content:center;align-items:center`;
        const B = `background:${C.bgFloat};border:1px solid ${C.border};padding:20px 24px;width:340px;max-width:90vw;font-family:"JetBrains Mono",monospace;font-size:12px;color:${C.fg}`;
        const R = `display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;color:${C.fgDim};font-size:11px`;
        const I = `width:80px;background:${C.bgDark};color:${C.fg};border:1px solid ${C.border};font-family:"JetBrains Mono",monospace;font-size:11px;padding:4px 6px;text-align:center;cursor:pointer`;

        settingsEl.style.cssText = S;
        settingsEl.innerHTML = `<div style="${B}">
<div style="font-size:13px;color:${C.accent};border-bottom:1px solid ${C.border};padding-bottom:8px;margin-bottom:16px;font-weight:bold">⚙ Mindful Settings</div>
<div style="${R}"><span>Panel mode</span><select data-s="panelMode" style="background:${C.bgDark};color:${C.fg};border:1px solid ${C.border};font-family:inherit;font-size:11px;padding:4px 6px"><option value="side">Side panel</option><option value="overlay">Overlay</option></select></div>
<div style="${R}"><span>Panel width</span><span style="display:flex;align-items:center;gap:8px"><input type="range" data-s="panelWidth" min="280" max="600" step="10" style="width:100px;accent-color:${C.accent}"><span data-s="panelWidthVal" style="color:${C.accent};min-width:45px;text-align:right;font-size:11px"></span></span></div>
<div style="margin-top:14px;padding-top:12px;border-top:1px solid ${C.border}">
<div style="font-size:11px;color:${C.accent};margin-bottom:10px">Keybindings — click field, press key (Esc to clear)</div>
<div style="${R}"><span>Comments</span><input data-key="keyComments" readonly style="${I}"></div>
<div style="${R}"><span>Recommendations</span><input data-key="keyRecs" readonly style="${I}"></div>
<div style="${R}"><span>Details</span><input data-key="keyDetails" readonly style="${I}"></div>
</div>
<button data-s="close" style="display:block;margin-top:16px;width:100%;padding:6px;background:${C.bgDark};color:${C.fg};border:1px solid ${C.border};font-family:inherit;font-size:11px;cursor:pointer;text-align:center">Close</button>
</div>`;

        // Wire events
        settingsEl.addEventListener("click", e => { if (e.target === settingsEl) closeSettings(); });
        settingsEl.querySelector("[data-s=close]").addEventListener("click", closeSettings);
        settingsEl.querySelector("[data-s=panelMode]").addEventListener("change", function() { prefs.panelMode = this.value; savePrefs(); });
        settingsEl.querySelector("[data-s=panelWidth]").addEventListener("input", function() {
            prefs.panelWidth = +this.value;
            settingsEl.querySelector("[data-s=panelWidthVal]").textContent = this.value + "px";
            savePrefs();
        });
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
        const el = settingsEl;
        el.querySelector("[data-s=panelMode]").value = prefs.panelMode;
        el.querySelector("[data-s=panelWidth]").value = prefs.panelWidth;
        el.querySelector("[data-s=panelWidthVal]").textContent = prefs.panelWidth + "px";
        el.querySelectorAll("[data-key]").forEach(inp => { inp.value = prefs[inp.dataset.key] || "(none)"; });
        el.style.display = "flex";
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
            { id:"subs",      icon:"subs",      label:"Subscriptions", action: () => location.href="/feed/subscriptions" },
            { id:"history",   icon:"history",    label:"History",       action: () => location.href="/feed/history" },
            { id:"watchlater",icon:"watchlater", label:"Watch Later",   action: () => location.href="/playlist?list=WL" },
            { id:"playlist",  icon:"playlist",   label:"Playlists",     action: () => location.href="/feed/playlists" },
            "sep",
            { id:"details",  icon:"details",  label:"Details",         action: () => isWatch() && togglePanel("details") },
            { id:"recs",     icon:"recs",     label:"Recommendations", action: () => isWatch() && togglePanel("recs") },
            { id:"comments", icon:"comments", label:"Comments",        action: () => isWatch() && togglePanel("comments") },
            { id:"chat",     icon:"chat",     label:"Live Chat",       action: () => isWatch() && isLive() && togglePanel("chat") },
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
            img.src = avatarImg.src;
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
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        if (isWatch()) {
            if (prefs.keyComments && e.key === prefs.keyComments) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); togglePanel("comments"); return; }
            if (prefs.keyRecs && e.key === prefs.keyRecs) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); togglePanel("recs"); return; }
            if (prefs.keyDetails && e.key === prefs.keyDetails) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); togglePanel("details"); return; }
        }
    }

    // ── SPA nav ──
    function onNav() {
        if (state.panelOpen) closePanel();
        if (searchEl?.classList.contains("open")) closeSearch();
        updateSidebar();
        setTimeout(ensureTheater, 800);
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

        setTimeout(ensureTheater, 1000);
        setTimeout(updateSidebar, 500);
        setTimeout(updateSidebar, 2000);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();

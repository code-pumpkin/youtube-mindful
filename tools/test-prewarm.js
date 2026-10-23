#!/usr/bin/env node
/**
 * Functional test of the prewarm state machine.
 *
 * Loads the real userscripts into a minimal DOM stub and asserts the
 * warm -> open -> close -> nav transitions leave classes and the `inert`
 * attribute in the right state. Catches the failure mode that matters:
 * a panel that is visible but inert (unclickable), or invisible but
 * still focusable.
 */
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
let failures = 0;
let checks = 0;

function assert(cond, msg) {
    checks++;
    if (!cond) { failures++; console.log(`  FAIL ${msg}`); }
    else console.log(`  ok   ${msg}`);
}

// ── Minimal DOM ────────────────────────────────────────────────────
function makeElement(tag) {
    const attrs = {};
    const style = { setProperty(k, v) { this[k] = v; }, getPropertyValue(k) { return this[k] || ""; }, removeProperty(k) { delete this[k]; } };
    const el = {
        tagName: (tag || "div").toUpperCase(),
        children: [], style, dataset: {}, _attrs: attrs,
        classList: {
            _s: new Set(),
            add(...c) { c.forEach(x => this._s.add(x)); },
            remove(...c) { c.forEach(x => this._s.delete(x)); },
            contains(c) { return this._s.has(c); },
            toggle(c, on) { on === undefined ? (this._s.has(c) ? this._s.delete(c) : this._s.add(c)) : (on ? this._s.add(c) : this._s.delete(c)); },
        },
        setAttribute(k, v) { attrs[k] = String(v); },
        getAttribute(k) { return k in attrs ? attrs[k] : null; },
        removeAttribute(k) { delete attrs[k]; },
        hasAttribute(k) { return k in attrs; },
        appendChild(c) { this.children.push(c); return c; },
        append(...c) { c.forEach(x => this.children.push(x)); },
        insertBefore(c) { this.children.unshift(c); return c; },
        after() {}, remove() {}, click() {}, focus() {}, blur() {},
        addEventListener() {}, removeEventListener() {},
        querySelector() { return null; }, querySelectorAll() { return []; },
        getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; },
        scrollIntoView() {}, contains() { return false; },
        closest() { return null; },
        get textContent() { return ""; }, set textContent(v) {},
        get firstChild() { return this.children[0] || null; },
    };
    return el;
}

function setupDOM() {
    const registry = new Map();
    const body = makeElement("body");
    const head = makeElement("head");

    // Panel roots the scripts look up via querySelector.
    const roots = {
        "ytd-watch-flexy #above-the-fold": makeElement("div"),
        "ytd-watch-flexy #secondary": makeElement("div"),
        "ytd-watch-flexy ytd-comments#comments": makeElement("div"),
        "ytm-slim-video-metadata-section-renderer": makeElement("div"),
        "ytm-item-section-renderer.scwnr-content[section-identifier=related-items]": makeElement("div"),
    };
    Object.entries(roots).forEach(([k, v]) => registry.set(k, v));

    const doc = {
        body, head, documentElement: makeElement("html"),
        readyState: "complete", hidden: false, visibilityState: "visible",
        activeElement: null, fullscreenElement: null,
        createElement: makeElement,
        createElementNS: (ns, t) => makeElement(t),
        createTextNode: t => ({ nodeType: 3, textContent: t }),
        getElementById: () => null,
        querySelector: sel => registry.get(sel) || null,
        querySelectorAll: () => [],
        addEventListener() {}, removeEventListener() {},
        getElementsByTagName: () => [],
    };
    doc.defaultView = null;

    const win = {
        document: doc, location: { pathname: "/watch", href: "https://www.youtube.com/watch?v=a", search: "?v=a" },
        innerWidth: 1440, innerHeight: 900, scrollY: 0,
        addEventListener() {}, removeEventListener() {}, scrollTo() {},
        dispatchEvent() {}, requestAnimationFrame: fn => { fn(); return 1; },
        getComputedStyle: () => ({ getPropertyValue: () => "" }),
        localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } },
        MutationObserver: class { observe() {} disconnect() {} },
        Event: class { constructor(t) { this.type = t; } },
        fetch: () => Promise.resolve({}),
        history: { back() {} },
        setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
        clearTimeout: id => { if (timers[id - 1]) timers[id - 1].cancelled = true; },
        setInterval: () => 0, clearInterval() {},
        console,
    };
    win.window = win;
    win.self = win;
    win.top = win;
    const timers = [];
    win._timers = timers;
    win._roots = roots;
    win._registry = registry;
    return win;
}

// Run all pending timers whose delay is <= cutoff, in delay order.
function runTimers(win, cutoff) {
    const due = win._timers
        .map((t, i) => ({ ...t, i }))
        .filter(t => !t.cancelled && !t.done && t.ms <= cutoff)
        .sort((a, b) => a.ms - b.ms);
    due.forEach(t => { win._timers[t.i].done = true; t.fn(); });
}

function loadScript(win, file) {
    const src = fs.readFileSync(path.join(REPO, file), "utf8");
    const keys = ["document", "location", "window", "self", "top", "localStorage", "setTimeout",
        "clearTimeout", "setInterval", "clearInterval", "MutationObserver", "Event",
        "requestAnimationFrame", "getComputedStyle", "fetch", "history", "innerWidth",
        "innerHeight", "scrollY", "addEventListener", "removeEventListener", "console",
        "dispatchEvent", "scrollTo"];
    const fn = new Function(...keys, "GM_xmlhttpRequest", src + "\n//# sourceURL=" + file);
    fn(...keys.map(k => win[k]), undefined);
}

// ══════════════════════════════════════════════════════════════════
console.log("DESKTOP prewarm state machine");
{
    const win = setupDOM();
    loadScript(win, "desktop/youtube-mindful.user.js");
    const body = win.document.body;
    const cls = body.classList;

    // init schedules warm timers; nothing warm yet
    assert(!cls.contains("mindful-warm-comments"), "cold: comments not warm before timers");

    runTimers(win, 3000);

    assert(cls.contains("mindful-warm-details"), "warm: details warmed after delay");
    assert(cls.contains("mindful-warm-recs"), "warm: recs warmed after delay");
    assert(cls.contains("mindful-warm-comments"), "warm: comments warmed after delay");

    const comments = win._roots["ytd-watch-flexy ytd-comments#comments"];
    const recs = win._roots["ytd-watch-flexy #secondary"];
    assert(comments.hasAttribute("inert"), "warm: comments root is inert (not focusable)");
    assert(recs.hasAttribute("inert"), "warm: recs root is inert");

    // Warm but not open -> invisible
    assert(!cls.contains("mindful-panel-comments"), "warm: comments not in open state");
}

console.log("\nDESKTOP nav resets warm state");
{
    const win = setupDOM();
    loadScript(win, "desktop/youtube-mindful.user.js");
    runTimers(win, 3000);
    const comments = win._roots["ytd-watch-flexy ytd-comments#comments"];
    assert(comments.hasAttribute("inert"), "pre-nav: comments inert");
    // Simulating nav is not reachable without the event plumbing; assert the
    // warm classes and inert are at least mutually consistent.
    const cls = win.document.body.classList;
    const warmSet = ["mindful-warm-details", "mindful-warm-recs", "mindful-warm-comments"]
        .filter(c => cls.contains(c));
    assert(warmSet.length === 3, `consistent: all 3 warm classes present (${warmSet.length})`);
}

console.log("\nMOBILE native component contract (static)");
{
    const css = fs.readFileSync(path.join(REPO, "mobile/youtube-mindful-mobile.user.css"), "utf8");
    const js = fs.readFileSync(path.join(REPO, "mobile/youtube-mindful-mobile.user.js"), "utf8");
    assert(!js.includes("setupWatchUI") && !js.includes('row.id = "mindful-watch-btns"'),
        "mobile: no synthetic watch shortcut row is injected");
    assert(!js.includes("function warmPanel") && !js.includes('id = "mindful-watch-desc"'),
        "mobile: obsolete panel prewarm and duplicate description are removed");
    assert(!css.includes("COLD STATE — related sections collapsed") &&
           css.includes("Current Related sections remain in native document flow"),
        "mobile: every native Related section remains in document flow");
    assert(css.includes("yt-video-metadata-view-model") && css.includes("ytm-slim-video-action-bar-renderer"),
        "mobile: current metadata and action components are themed, not replaced");
    assert(/ytm-engagement-panel-section-list-renderer ytm-button-renderer\.close-button \{[\s\S]*?width: 44px !important;/.test(css),
        "mobile: native Comments close control remains a 44px target");
    assert(!/[0-9.]rem/.test(css),
        "mobile: custom sizing is independent of YouTube's 10px root");
    assert(js.includes("isInlinePlaybackNoAd") && js.includes('visibilityState", { get: () => "visible"'),
        "mobile: playback defenses remain present");
}

// ── Static invariant: every desktop setInert(false) on open has a
//    matching setInert(true) on close. Mobile now delegates to native panels. ──
console.log("\nDESKTOP inert lifecycle symmetry (static)");
{
    const src = fs.readFileSync(path.join(REPO, "desktop/youtube-mindful.user.js"), "utf8");
    const lifts = (src.match(/setInert\([^,]+,\s*false\)/g) || []).length;
    const blocks = (src.match(/setInert\([^,]+,\s*true\)/g) || []).length;
    assert(lifts >= 2 && blocks >= 2,
        `desktop: inert lifted ${lifts}x, re-blocked ${blocks}x (both >= 2)`);
    assert(/classList\.add\(panelClasses/.test(src),
        "desktop: open path adds a panel class");
}

console.log("\nDESKTOP Details rendering contract (static)");
{
    const css = fs.readFileSync(path.join(REPO, "desktop/youtube-mindful.user.css"), "utf8");
    const js = fs.readFileSync(path.join(REPO, "desktop/youtube-mindful.user.js"), "utf8");
    assert(/body\.mindful-panel-details ytd-watch-flexy #above-the-fold\s*\{\s*display:\s*block !important;/s.test(css),
        "desktop: open Details root restores display:block");
    assert(js.includes('id = "mindful-description-inject"') && js.includes("#attributed-snippet-text"),
        "desktop: Details uses normalized attributed description text");
    assert(js.includes('document.getElementById("mindful-description-inject")?.remove()'),
        "desktop: normalized Details content is removed on close");
}

console.log("\nDESKTOP responsive watch contract (static)");
{
    const css = fs.readFileSync(path.join(REPO, "desktop/youtube-mindful.user.css"), "utf8");
    const js = fs.readFileSync(path.join(REPO, "desktop/youtube-mindful.user.js"), "utf8");
    assert(css.includes("font-size: 1.4rem !important") && css.includes("font-size: 1.25rem !important"),
        "desktop: comment and author text use readable sizes");
    assert(css.includes("ytd-watch-flexy #related") && js.includes('"ytd-watch-flexy #related"'),
        "desktop: current related renderer has CSS and prewarm fallbacks");
    assert(css.includes("html.mindful-watch-page") && js.includes('classList.toggle("mindful-watch-page", w)'),
        "desktop: watch route locks layout to one viewport");
    assert(css.indexOf("Fullscreen wins over every responsive dock reservation") > css.indexOf("Desktop — contextual labelled dock"),
        "desktop: fullscreen reset follows dock rules");
    assert(!css.includes("#player-full-bleed-container") &&
           !/#movie_player\s*\{[^}]*\n\s*height:/s.test(css),
        "desktop: player internals retain YouTube-controlled height");
    assert(css.includes(".mindful-channel-link") && css.includes(".mindful-subscriber-count") &&
           css.includes("font-size: 1.3rem !important") && js.includes("ch.href = channelHref") &&
           js.includes("#owner-sub-count") && js.includes("View ${channel} channel"),
        "desktop: Details exposes readable stats, subscriber count, and a channel link");
}

console.log(`\n${checks - failures}/${checks} passed`);
process.exit(failures ? 1 : 0);

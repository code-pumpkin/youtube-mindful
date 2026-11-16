#!/usr/bin/env node
/**
 * Unit tests for the Details-panel description helpers: link safety,
 * chapter timestamps, and plain-text URL splitting.
 *
 * The helpers are pure functions inside the userscript's IIFE, so this pulls
 * the "Description rendering" block out of the real source and evaluates it
 * with a stub document/location. The code under test is the shipped code.
 */
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.resolve(__dirname, "../desktop/youtube-mindful.user.js"), "utf8");
const start = src.indexOf("// ── Description rendering ──");
const end = src.indexOf("// ── Stats injection (for details panel) ──");
if (start < 0 || end < 0) { console.log("FAIL could not locate the description block"); process.exit(1); }

const api = new Function("document", "location",
    `${src.slice(start, end)}\nreturn { safeLinkTarget, timestampSeconds, splitUrls };`)(
    {}, { href: "https://www.youtube.com/watch?v=VID", origin: "https://www.youtube.com", search: "?v=VID" });
const { safeLinkTarget: S, timestampSeconds: T, splitUrls: U } = api;

let failures = 0, checks = 0;
function eq(name, got, want) {
    checks++;
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) { failures++; console.log(`  FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
    else console.log(`  ok   ${name}`);
}
const B = "https://www.youtube.com/watch?v=VID";
const u = h => new URL(h, B);

console.log("DESCRIPTION link safety");
eq("javascript: is dropped", S("javascript:alert(1)", B), null);
eq("data: is dropped", S("data:text/html,x", B), null);
eq("vbscript: is dropped", S("vbscript:x", B), null);
eq("relative link resolves", S("/channel/UC1", B).href, "https://www.youtube.com/channel/UC1");
eq("youtube redirect is unwrapped",
    S("https://www.youtube.com/redirect?q=https%3A%2F%2Fexample.com%2Fa%3Fb%3D1&redir_token=x", B).href,
    "https://example.com/a?b=1");
eq("redirect to javascript: is dropped", S("https://www.youtube.com/redirect?q=javascript%3Aalert(1)", B), null);
eq("redirect without q is dropped", S("https://www.youtube.com/redirect?x=1", B), null);
eq("look-alike host is not unwrapped", S("https://evilyoutube.com/redirect?q=https%3A%2F%2Fa.com", B).hostname, "evilyoutube.com");

console.log("\nDESCRIPTION chapter timestamps");
eq("t=13s", T(u("/watch?v=VID&t=13s"), "VID"), 13);
eq("t=90", T(u("/watch?v=VID&t=90"), "VID"), 90);
eq("t=1h2m3s", T(u("/watch?v=VID&t=1h2m3s"), "VID"), 3723);
eq("t=2m", T(u("/watch?v=VID&t=2m"), "VID"), 120);
eq("other video is not a seek", T(u("/watch?v=OTHER&t=13s"), "VID"), null);
eq("no t param", T(u("/watch?v=VID"), "VID"), null);
eq("garbage t", T(u("/watch?v=VID&t=abc"), "VID"), null);
eq("empty t", T(u("/watch?v=VID&t="), "VID"), null);
eq("non-watch path", T(u("/shorts/VID?t=5"), "VID"), null);

console.log("\nDESCRIPTION plain-text URL splitting");
eq("trailing period excluded", U("see https://a.com/x."),
    [{ type: "text", value: "see " }, { type: "url", value: "https://a.com/x" }, { type: "text", value: "." }]);
eq("closing paren excluded", U("(https://a.com/x)"),
    [{ type: "text", value: "(" }, { type: "url", value: "https://a.com/x" }, { type: "text", value: ")" }]);
eq("two urls", U("a https://x.com b https://y.com/p?q=1 c").filter(s => s.type === "url").map(s => s.value),
    ["https://x.com", "https://y.com/p?q=1"]);
eq("no url", U("nothing here"), [{ type: "text", value: "nothing here" }]);
eq("empty string", U(""), []);

console.log(`\n${checks - failures}/${checks} passed`);
process.exit(failures ? 1 : 0);

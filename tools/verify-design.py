#!/usr/bin/env python3
"""Verify the design system holds: contrast ratios, token usage, warm/open pairing."""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FAIL = []


def lin(c):
    c /= 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def lum(hexstr):
    h = hexstr.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def ratio(fg, bg):
    a, b = lum(fg), lum(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


# ── 1. Contrast: every text token against every surface it can sit on ──
SURFACES = {"--bg": "#121110", "--bg-sunken": "#0d0c0b", "--surface": "#1a1917", "--surface-2": "#232120"}
TEXT = {"--fg": "#eae5dc", "--fg-muted": "#a39d94", "--fg-subtle": "#8e8981", "--accent": "#b8a98f"}

print("Contrast (WCAG AA needs 4.5:1 for body text)")
for tname, tval in TEXT.items():
    for sname, sval in SURFACES.items():
        r = ratio(tval, sval)
        ok = r >= 4.5
        print(f"  {'ok  ' if ok else 'FAIL'} {tname:12} on {sname:12} {r:5.2f}:1")
        if not ok:
            FAIL.append(f"contrast {tname} on {sname} = {r:.2f}:1")

# Status colors only need 3:1 (non-text / large indicator use)
print("\nStatus colors on --bg (indicator use, 3:1 floor)")
for name, val in {"--success": "#8faa78", "--warning": "#c9b177",
                  "--danger": "#c4796b", "--info": "#8ba3b8"}.items():
    r = ratio(val, "#121110")
    ok = r >= 3.0
    print(f"  {'ok  ' if ok else 'FAIL'} {name:10} {r:5.2f}:1")
    if not ok:
        FAIL.append(f"contrast {name} = {r:.2f}:1")

# ── 2. No banned old colors linger ──
BANNED = ["#4a4a4a", "#8a8a8a", "#e8e2d6", "#c8c0b0", "#101010", "#0a0a0a", "#181818", "#b8a0d0", "#90b0c8"]
print("\nStale color literals")
for f in ["desktop/youtube-mindful.user.css", "desktop/youtube-mindful.user.js",
          "mobile/youtube-mindful-mobile.user.css", "mobile/youtube-mindful-mobile.user.js"]:
    text = (REPO / f).read_text().lower()
    hits = [b for b in BANNED if b in text]
    print(f"  {'ok  ' if not hits else 'FAIL'} {f}" + (f"  -> {hits}" if hits else ""))
    if hits:
        FAIL.append(f"{f} still contains {hits}")

# ── 3. Braces balance in each CSS file ──
print("\nCSS brace balance")
for f in ["desktop/youtube-mindful.user.css", "mobile/youtube-mindful-mobile.user.css"]:
    text = (REPO / f).read_text()
    stripped = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    o, c = stripped.count("{"), stripped.count("}")
    ok = o == c
    print(f"  {'ok  ' if ok else 'FAIL'} {f}  {{={o} }}={c}")
    if not ok:
        FAIL.append(f"{f} brace mismatch {o}/{c}")

# ── 4. Every warm class has a matching open class in the CSS ──
print("\nWarm/open state pairing")
pairs = [
    ("desktop/youtube-mindful.user.css",
     ["mindful-warm-details", "mindful-warm-recs", "mindful-warm-comments"],
     ["mindful-panel-details", "mindful-panel-recs", "mindful-panel-comments"]),
    ("mobile/youtube-mindful-mobile.user.css",
     ["mindful-warm-details", "mindful-warm-related"],
     ["mindful-m-details", "mindful-m-related"]),
]
for f, warms, opens in pairs:
    text = (REPO / f).read_text()
    for w, o in zip(warms, opens):
        has_w, has_o = w in text, o in text
        # warm must also have a :not(open) neutralizer so it stays invisible
        has_guard = f"{w}:not(.{o})" in text
        ok = has_w and has_o and has_guard
        print(f"  {'ok  ' if ok else 'FAIL'} {f.split('/')[0]:8} {w} / {o}"
              f"{'' if has_guard else '  MISSING :not() guard'}")
        if not ok:
            FAIL.append(f"{f}: {w}/{o} pairing incomplete")

# ── 5. Warm classes referenced in JS must exist in CSS ──
print("\nJS warm classes present in CSS")
for js, css in [("desktop/youtube-mindful.user.js", "desktop/youtube-mindful.user.css"),
                ("mobile/youtube-mindful-mobile.user.js", "mobile/youtube-mindful-mobile.user.css")]:
    js_classes = set(re.findall(r'"(mindful-warm-[a-z]+)"', (REPO / js).read_text()))
    css_text = (REPO / css).read_text()
    missing = sorted(c for c in js_classes if c not in css_text)
    print(f"  {'ok  ' if not missing else 'FAIL'} {js.split('/')[0]:8} {sorted(js_classes)}"
          + (f"  missing: {missing}" if missing else ""))
    if missing:
        FAIL.append(f"{js}: classes not styled: {missing}")

# ── 6. Font-size scale discipline: no raw px sizes outside the scale ──
print("\nHardcoded px font sizes (should use --fs-* tokens)")
for f in ["desktop/youtube-mindful.user.css", "mobile/youtube-mindful-mobile.user.css"]:
    text = (REPO / f).read_text()
    raw = re.findall(r"font-size:\s*(\d+)px", text)
    print(f"  {'ok  ' if not raw else 'warn'} {f}" + (f"  -> {sorted(set(raw))}px" if raw else ""))

# ── 7. reduced-motion + safe-area present ──
print("\nAccessibility guards")
for f in ["desktop/youtube-mindful.user.css", "mobile/youtube-mindful-mobile.user.css"]:
    text = (REPO / f).read_text()
    checks = {
        "prefers-reduced-motion": "prefers-reduced-motion" in text,
        "focus-visible": "focus-visible" in text,
    }
    if "mobile" in f or "700px" in text:
        checks["safe-area-inset"] = "safe-area-inset" in text
    for name, ok in checks.items():
        print(f"  {'ok  ' if ok else 'FAIL'} {f.split('/')[0]:8} {name}")
        if not ok:
            FAIL.append(f"{f} missing {name}")

print()
if FAIL:
    print(f"{len(FAIL)} FAILURES:")
    for x in FAIL:
        print(f"  - {x}")
    sys.exit(1)
print("all checks passed")

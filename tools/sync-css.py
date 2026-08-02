#!/usr/bin/env python3
"""Splice the .user.css body into the CSS template string inside the matching .user.js.

Keeps the two copies of the stylesheet in sync. Strips the UserStyle metadata
header and the @-moz-document wrapper, since the JS injects into the page directly.
"""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def css_body(path: Path) -> str:
    text = path.read_text()
    text = re.sub(r"/\*\s*==UserStyle==.*?==/UserStyle==\s*\*/\s*", "", text, flags=re.S)
    start = text.find("@-moz-document")
    if start == -1:
        sys.exit(f"no @-moz-document wrapper found in {path}")
    open_brace = text.find("{", start)
    close_brace = text.rfind("}")
    if open_brace == -1 or close_brace <= open_brace:
        sys.exit(f"malformed @-moz-document wrapper in {path}")
    body = text[open_brace + 1:close_brace].strip()
    if "`" in body or "${" in body:
        sys.exit(f"{path}: body contains backtick or ${{ — would break the JS template literal")
    return body


def splice(js_path: Path, var: str, body: str) -> None:
    text = js_path.read_text()
    pattern = re.compile(r"(const " + re.escape(var) + r" = `)(.*?)(`;)", flags=re.S)
    if not pattern.search(text):
        sys.exit(f"{js_path}: could not find `const {var} = ` ... `;`")
    new_text = pattern.sub(lambda m: m.group(1) + "\n" + body + "\n" + m.group(3), text, count=1)
    js_path.write_text(new_text)
    print(f"synced {js_path.name}  ({len(body.splitlines())} css lines)")


for css_rel, js_rel, var in [
    ("desktop/youtube-mindful.user.css", "desktop/youtube-mindful.user.js", "MINDFUL_CSS"),
    ("mobile/youtube-mindful-mobile.user.css", "mobile/youtube-mindful-mobile.user.js", "CSS"),
]:
    splice(REPO / js_rel, var, css_body(REPO / css_rel))

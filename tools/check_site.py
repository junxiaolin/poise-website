#!/usr/bin/env python3
"""Validate static entry points and the immutable browser demo release."""
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
errors = []


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.refs = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            if attrs["id"] in self.ids:
                errors.append(f"Duplicate id: {attrs['id']}")
            self.ids.add(attrs["id"])
        for key in ("src", "href", "poster", "data-policy-src"):
            if attrs.get(key):
                self.refs.append(attrs[key])


pages = {}
for name in ("index.html", "demo.html"):
    parser = Page()
    source = (ROOT / name).read_text()
    parser.feed(source)
    pages[name] = parser
    for forbidden in ("poise6d.github.io", "Anonymous Authors", "noindex"):
        if forbidden in source:
            errors.append(f"{name}: stale public-page content: {forbidden}")

for name, page in pages.items():
    for ref in page.refs:
        url = urlsplit(ref)
        if url.scheme or url.netloc:
            continue
        if url.path.startswith("/"):
            errors.append(f"{name}: root-relative URL breaks project hosting: {ref}")
            continue
        target = ROOT / unquote(url.path) if url.path else ROOT / name
        if target.is_dir():
            target /= "index.html"
        if not target.is_file():
            errors.append(f"{name}: missing resource {ref}")
        if url.fragment and target.name in pages:
            if unquote(url.fragment) not in pages[target.name].ids:
                errors.append(f"{name}: missing fragment {ref}")

release = ROOT / "policy-demo/r-2c8930975c67ceeb"
manifest = json.loads((release / "release.json").read_text())
for name, expected in manifest["files"].items():
    path = release / name
    if not path.is_file():
        errors.append(f"Missing demo asset: {name}")
        continue
    data = path.read_bytes()
    if len(data) != expected["bytes"] or hashlib.sha256(data).hexdigest() != expected["sha256"]:
        errors.append(f"Demo asset differs from release manifest: {name}")

if not (ROOT / ".nojekyll").exists():
    errors.append("Missing .nojekyll")
if errors:
    raise SystemExit("\n".join(errors))
print(f"PASS: 2 entry pages, local links, and {len(manifest['files'])} demo assets.")

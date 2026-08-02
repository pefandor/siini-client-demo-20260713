#!/usr/bin/env python3
"""Normalize a mirrored WordPress site for a GitHub Pages project path."""

from __future__ import annotations

import html
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse


ROOT = Path(__file__).resolve().parents[1]
REPO_SLUG = "siini-client-demo-20260713"
PUBLIC_ORIGIN = "https://pefandor.github.io"
BASE_PATH = f"/{REPO_SLUG}/"
PUBLIC_BASE = f"{PUBLIC_ORIGIN}{BASE_PATH}"

HTML_ATTR_RE = re.compile(
    r"(?P<attr>href|src|action|poster)=(?P<quote>['\"])(?P<url>.*?)(?P=quote)",
    re.IGNORECASE,
)
SRCSET_RE = re.compile(
    r"(?P<attr>srcset)=(?P<quote>['\"])(?P<value>.*?)(?P=quote)",
    re.IGNORECASE,
)
SCRIPT_RE = re.compile(r"<script\b(?P<attrs>[^>]*)>.*?</script>", re.IGNORECASE | re.DOTALL)
UNNEEDED_LINK_RE = re.compile(
    r"<link\b[^>]*(?:rel=['\"](?:alternate|EditURI|modulepreload)['\"]|wp-json|xmlrpc\.php)[^>]*>\s*",
    re.IGNORECASE,
)


def page_url(path: Path) -> str:
    relative = path.relative_to(ROOT).as_posix()
    if relative == "index.html":
        return PUBLIC_BASE
    if relative.endswith("/index.html"):
        relative = relative[: -len("index.html")]
    return f"{PUBLIC_BASE}{relative}"


def collapse_base(value: str) -> str:
    doubled_path = f"{BASE_PATH}{REPO_SLUG}/"
    doubled_url = f"{PUBLIC_ORIGIN}{doubled_path}"
    while doubled_path in value:
        value = value.replace(doubled_path, BASE_PATH)
    while doubled_url in value:
        value = value.replace(doubled_url, PUBLIC_BASE)
    # Some mirrored product pages lost the trailing slash on the inner base.
    value = value.replace(
        f"{BASE_PATH}{REPO_SLUG}",
        BASE_PATH.rstrip("/"),
    )
    return value


def normalize_url(raw_value: str, current_page: str) -> str:
    value = html.unescape(raw_value.strip())
    if not value or value.startswith(("#", "data:", "mailto:", "tel:", "javascript:")):
        return raw_value

    value = collapse_base(value)
    yandex_image_prefix = f"{BASE_PATH}get-altay/"
    if value.startswith(yandex_image_prefix):
        return f"https://avatars.mds.yandex.net/get-altay/{value[len(yandex_image_prefix):]}"
    value = value.replace("/shop/index.html%3F", "/shop/index.html?")
    value = re.sub(
        r"/shop/index\.html\?siini_brand=([^&#]+?)\.html$",
        r"/shop/?siini_brand=\1",
        value,
    )
    if value == f"{BASE_PATH}privacy/":
        value = f"{BASE_PATH}privacy-policy/"
    elif value == f"{BASE_PATH}returns/":
        value = f"{BASE_PATH}return-exchange/"
    parsed = urlparse(value)
    if parsed.scheme in {"http", "https"} and parsed.netloc not in {
        "pefandor.github.io",
        "localhost:8080",
        "127.0.0.1:8080",
    }:
        return raw_value

    if parsed.netloc in {"localhost:8080", "127.0.0.1:8080"}:
        value = parsed.path or "/"
        if parsed.query:
            value += f"?{parsed.query}"
        if parsed.fragment:
            value += f"#{parsed.fragment}"
    elif parsed.netloc == "pefandor.github.io":
        value = parsed.path or BASE_PATH
        if parsed.query:
            value += f"?{parsed.query}"
        if parsed.fragment:
            value += f"#{parsed.fragment}"

    absolute = urljoin(current_page, value)
    absolute_parsed = urlparse(absolute)
    path = collapse_base(absolute_parsed.path)
    if not path.startswith(BASE_PATH):
        path = f"{BASE_PATH}{path.lstrip('/')}"
    path = collapse_base(path)

    result = path
    if absolute_parsed.query:
        result += f"?{absolute_parsed.query}"
    if absolute_parsed.fragment:
        result += f"#{absolute_parsed.fragment}"
    return html.escape(result, quote=True)


def normalize_srcset(value: str, current_page: str) -> str:
    normalized: list[str] = []
    for candidate in value.split(","):
        parts = candidate.strip().split()
        if not parts:
            continue
        url = normalize_url(parts[0], current_page)
        normalized.append(" ".join([url, *parts[1:]]))
    return ", ".join(normalized)


def keep_script(match: re.Match[str]) -> str:
    attrs = match.group("attrs")
    has_src = re.search(r"\bsrc\s*=", attrs, re.IGNORECASE) is not None
    if has_src and ("site.js" in attrs or "static-demo.js" in attrs):
        return match.group(0)
    return ""


def normalize_html(path: Path) -> tuple[int, int]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    before = text
    current_page = page_url(path)

    text = collapse_base(text)
    text = SCRIPT_RE.sub(keep_script, text)
    text = UNNEEDED_LINK_RE.sub("", text)

    def replace_attr(match: re.Match[str]) -> str:
        attr = match.group("attr")
        quote = match.group("quote")
        value = normalize_url(match.group("url"), current_page)
        return f"{attr}={quote}{value}{quote}"

    def replace_srcset(match: re.Match[str]) -> str:
        attr = match.group("attr")
        quote = match.group("quote")
        value = normalize_srcset(match.group("value"), current_page)
        return f"{attr}={quote}{value}{quote}"

    text = HTML_ATTR_RE.sub(replace_attr, text)
    text = SRCSET_RE.sub(replace_srcset, text)
    text = collapse_base(text)
    for origin in (
        "http://localhost:8080/",
        "https://localhost:8080/",
        "http://127.0.0.1:8080/",
        "https://127.0.0.1:8080/",
    ):
        text = text.replace(origin, BASE_PATH)
    for origin in (
        r"http:\/\/localhost:8080\/",
        r"https:\/\/localhost:8080\/",
        r"http:\/\/127.0.0.1:8080\/",
        r"https:\/\/127.0.0.1:8080\/",
    ):
        text = text.replace(origin, BASE_PATH.replace("/", r"\/"))
    text = text.replace("http%3A%2F%2Flocalhost%3A8080", "")
    text = text.replace("https%3A%2F%2Flocalhost%3A8080", "")

    if "assets/static-demo.css" not in text and "</head>" in text:
        text = text.replace(
            "</head>",
            f'<link rel="stylesheet" href="{BASE_PATH}assets/static-demo.css" media="all" />\n</head>',
        )
    if 'rel="icon"' not in text and "</head>" in text:
        text = text.replace(
            "</head>",
            '<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22><rect width=%2264%22 height=%2264%22 fill=%22white%22/><text x=%2232%22 y=%2242%22 text-anchor=%22middle%22 font-size=%2234%22 font-family=%22serif%22 fill=%22black%22>S</text></svg>" />\n</head>',
        )
    if "assets/static-demo.js" not in text and "</body>" in text:
        text = text.replace(
            "</body>",
            f'<script defer src="{BASE_PATH}assets/static-demo.js"></script>\n</body>',
        )

    # Mirrored markup contains indentation-only lines. Keep generated snapshots
    # deterministic and compatible with git diff --check.
    text = "\n".join(line.rstrip() for line in text.splitlines()) + "\n"

    if text != before:
        path.write_text(text, encoding="utf-8")
    return before.count("localhost:8080"), text.count("localhost:8080")


def main() -> None:
    html_files = sorted(ROOT.rglob("*.html"))
    localhost_before = 0
    localhost_after = 0
    for path in html_files:
        before, after = normalize_html(path)
        localhost_before += before
        localhost_after += after

    malformed = 0
    for path in html_files:
        text = path.read_text(encoding="utf-8", errors="ignore")
        malformed += text.count(f"{BASE_PATH}{REPO_SLUG}/")

    print(
        f"normalized_html={len(html_files)} "
        f"localhost_before={localhost_before} localhost_after={localhost_after} "
        f"double_base_after={malformed}"
    )
    if localhost_after or malformed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

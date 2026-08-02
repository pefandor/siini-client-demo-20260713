#!/usr/bin/env python3
"""Fetch the public-demo page snapshots that are linked from the storefront."""

from __future__ import annotations

from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
LOCAL_ORIGIN = "http://localhost:8080"
ROUTES = (
    "/brands/",
    "/brand/c-p-company/",
    "/brand/new-balance/",
    "/brand/nike/",
    "/brand/stone-island/",
    "/delivery-payment/",
    "/faq/",
    "/offer/",
    "/personal-data-consent/",
    "/privacy-policy/",
    "/product-category/accessories/",
    "/product-category/bags/",
    "/product-category/outerwear/",
    "/product-category/pants-shorts/",
    "/product-category/sweaters-cardigans/",
    "/product-category/tshirts/",
    "/product/свитшот-stone-island-white/",
    "/return-exchange/",
)


def main() -> None:
    for route in ROUTES:
        url = f"{LOCAL_ORIGIN}{quote(route, safe='/')}"
        with urlopen(url, timeout=20) as response:
            body = response.read()
            if response.status != 200:
                raise RuntimeError(f"{route}: HTTP {response.status}")
        target = ROOT / route.strip("/") / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(body)
        print(f"{route} -> {target.relative_to(ROOT)} ({len(body)} bytes)")


if __name__ == "__main__":
    main()

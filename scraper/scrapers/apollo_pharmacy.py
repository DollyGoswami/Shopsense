"""
Apollo Pharmacy scraper.
"""
import json
import re
import urllib.parse
from datetime import datetime, timezone

import httpx
from bs4 import BeautifulSoup

from utils.headers import get_apollo_headers
from utils.parser import clean_price, clean_rating, normalize_product_name
from utils.playwright_support import can_use_playwright, run_playwright_task
from utils.storage import log_scrape, upsert_products

BASE_URL = "https://www.apollopharmacy.in"
SEARCH_URLS = (
    "{base}/search-medicines/{query}?page={page}",
    "{base}/search?keyword={query}&page={page}",
    "{base}/search?q={query}&page={page}",
    "{base}/search?searchTerm={query}&page={page}",
)

INVALID_PRODUCT_NAMES = {
    "footer link",
    "shop by category",
    "view all",
    "add to cart",
    "buy now",
}


def _is_product_path(url: str) -> bool:
    normalized = str(url or "").lower()
    return any(token in normalized for token in ["/otc/", "/medicine/", "/products/"])


def _is_valid_product_name(name: str) -> bool:
    normalized = normalize_product_name(str(name or "")).strip().lower()
    if not normalized:
        return False
    if normalized in INVALID_PRODUCT_NAMES:
        return False
    if normalized.startswith("footer"):
        return False
    return True


def _extract_image_url(img) -> str | None:
    if not img:
        return None

    src = img.get("src") or img.get("data-src")
    if src:
        return src.strip().split(" ")[0]

    srcset = img.get("srcset") or ""
    if srcset:
        return srcset.split(",")[0].strip().split(" ")[0]

    return None


def _walk_products(node, results):
    if isinstance(node, dict):
        has_name = node.get("name") or node.get("productName") or node.get("title")
        has_price = any(key in node for key in ["price", "specialPrice", "salePrice", "mrp"])
        has_url = any(key in node for key in ["url", "slug", "productUrl"])

        if has_name and (has_price or has_url):
            product_id = node.get("sku") or node.get("id") or node.get("productId") or node.get("slug")
            url = node.get("url") or node.get("productUrl") or node.get("slug") or ""
            if url and not str(url).startswith("http"):
                url = f"{BASE_URL}/{str(url).lstrip('/')}"

            name = normalize_product_name(str(has_name))
            current_price = clean_price(str(node.get("specialPrice") or node.get("salePrice") or node.get("price") or ""))
            original_price = clean_price(str(node.get("mrp") or node.get("listPrice") or ""))

            if not _is_valid_product_name(name) or not _is_product_path(url):
                name = ""

            image = node.get("image") or node.get("imageUrl")
            if isinstance(image, dict):
                image = image.get("src")

            if name and (current_price is not None or original_price is not None):
                results.append({
                    "source": "apollo_pharmacy",
                    "source_id": str(product_id or url or has_name),
                    "name": name,
                    "brand": node.get("brand"),
                    "category": node.get("category") or "Pharmacy",
                    "url": url,
                    "image": image,
                    "images": [image] if image else [],
                    "current_price": current_price,
                    "original_price": original_price,
                    "discount_pct": node.get("discount") if isinstance(node.get("discount"), (int, float)) else None,
                    "rating": clean_rating(str(node.get("rating") or "")),
                    "review_count": node.get("reviewCount") or node.get("ratingCount") or 0,
                    "currency": "INR",
                    "availability": "in_stock" if node.get("inStock", True) else "out_of_stock",
                    "description": node.get("description"),
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                })

        for value in node.values():
            _walk_products(value, results)
    elif isinstance(node, list):
        for value in node:
            _walk_products(value, results)


def _extract_from_html(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    results = []

    for script in soup.find_all("script"):
        text = script.string or script.get_text() or ""
        if not text:
            continue

        if script.get("type") == "application/ld+json":
            try:
                _walk_products(json.loads(text), results)
            except Exception:
                pass

        if "__NEXT_DATA__" in text or "products" in text.lower():
            for match in re.finditer(r'(\{.*"props".*\})', text, re.DOTALL):
                try:
                    payload = json.loads(match.group(1))
                    _walk_products(payload, results)
                except Exception:
                    continue

    if not results:
        results.extend(_extract_from_rendered_cards(html))

    deduped = {}
    for product in results:
        if not product["name"] or not product["source_id"]:
            continue
        existing = deduped.get(product["source_id"])
        if not existing:
            deduped[product["source_id"]] = product
            continue
        existing_score = int(existing.get("current_price") is not None) + int(bool(existing.get("image"))) + int(bool(existing.get("description")))
        product_score = int(product.get("current_price") is not None) + int(bool(product.get("image"))) + int(bool(product.get("description")))
        if product_score >= existing_score:
            deduped[product["source_id"]] = product
    return list(deduped.values())


def _extract_from_rendered_cards(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    results = []

    link_selectors = [
        "a[aria-label][href*='/otc/']",
        "a[aria-label][href*='/medicine/']",
        "a[aria-label][href*='/products/']",
        "a[href*='/otc/']",
        "a[href*='/medicine/']",
        "a[href*='/products/']",
        "a[href*='/prescriptions/']",
        "a[href*='/search-product/']",
    ]

    for link in soup.select(", ".join(link_selectors)):
        name = normalize_product_name(
            link.get("aria-label")
            or link.get("title")
            or link.get_text(" ", strip=True)
        )
        href = link.get("href") or ""
        if not _is_valid_product_name(name) or not href or not _is_product_path(href):
            continue

        card = (
            link.find_parent("div", class_=re.compile(r"ProductCard_"))
            or link.find_parent("div", attrs={"data-testid": re.compile(r"product", re.IGNORECASE)})
            or link.find_parent("article")
            or link.find_parent("li")
            or link.find_parent("div", class_=re.compile(r"product", re.IGNORECASE))
            or link.parent
        )
        card_text = card.get_text("\n", strip=True) if card else link.get_text("\n", strip=True)

        current_match = re.search(r"(?:₹|â‚¹)\s*([\d,]+(?:\.\d+)?)", card_text)
        original_match = re.search(r"MRP\s*(?:₹|â‚¹)\s*([\d,]+(?:\.\d+)?)", card_text, re.IGNORECASE)
        discount_match = re.search(r"(\d+)\s*%\s*off", card_text, re.IGNORECASE)
        subheads = []
        if card:
            for tag in card.select("h2, h3, p, span"):
                text = tag.get_text(" ", strip=True)
                if text and text != name and text not in subheads:
                    subheads.append(text)
                if len(subheads) >= 2:
                    break
        image = _extract_image_url((card or link).select_one("img"))

        results.append({
            "source": "apollo_pharmacy",
            "source_id": href.rstrip("/").split("/")[-1],
            "name": name,
            "category": " / ".join(subheads[:2]) if subheads else "Pharmacy",
            "url": href if href.startswith("http") else f"{BASE_URL}{href}",
            "image": image,
            "images": [image] if image else [],
            "current_price": clean_price(current_match.group(0) if current_match else ""),
            "original_price": clean_price(original_match.group(0) if original_match else ""),
            "discount_pct": int(discount_match.group(1)) if discount_match else None,
            "rating": None,
            "review_count": 0,
            "currency": "INR",
            "availability": "in_stock" if re.search(r"add\s+to\s+cart|buy\s+now|\badd\b", card_text, re.IGNORECASE) else "unknown",
            "description": None,
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        })


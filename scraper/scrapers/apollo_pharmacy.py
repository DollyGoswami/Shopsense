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

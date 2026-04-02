"""
Myntra scraper.
"""
import json
import re
import urllib.parse
from datetime import datetime, timezone

import httpx
from bs4 import BeautifulSoup

from utils.headers import get_myntra_headers
from utils.parser import clean_price, clean_rating, normalize_product_name
from utils.storage import log_scrape, upsert_products

BASE_URL = "https://www.myntra.com"
API_URL = "https://www.myntra.com/gateway/v2/search"


def _parse_discount(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    match = re.search(r"(\d+)", str(value))
    return int(match.group(1)) if match else None


def _normalize_item(item):
    price = item.get("discountedPrice") or item.get("price")
    original_price = item.get("mrp") or item.get("landingPagePrice") or item.get("price")
    product_id = item.get("productId") or item.get("id")
    url = item.get("landingPageUrl") or item.get("productUrl") or ""
    if url and not str(url).startswith("http"):
        url = f"{BASE_URL}/{str(url).lstrip('/')}"

    image = item.get("searchImage") or item.get("defaultImage") or item.get("image")

    return {
        "source": "myntra",
        "source_id": str(product_id or url or item.get("product") or ""),
        "name": normalize_product_name(item.get("product") or item.get("productName") or item.get("title") or ""),
        "brand": item.get("brand"),
        "category": item.get("category") or item.get("articleType") or "Fashion",
        "url": url,
        "image": image,
        "images": [image] if image else [],
        "current_price": clean_price(str(price or "")),
        "original_price": clean_price(str(original_price or "")),
        "discount_pct": _parse_discount(item.get("discount") or item.get("discountLabel")),
        "rating": clean_rating(str(item.get("rating") or item.get("productRatings") or "")),
        "review_count": item.get("ratingCount") or item.get("reviewCount") or 0,
        "currency": "INR",
        "availability": "in_stock",
        "description": item.get("additionalInfo") or item.get("searchTags"),
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }

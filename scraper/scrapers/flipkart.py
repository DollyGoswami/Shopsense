"""
Flipkart scraper.
"""
import asyncio
import random
import re
import urllib.parse
from datetime import datetime, timezone
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

from utils.headers import get_flipkart_headers
from utils.parser import clean_price, clean_rating, clean_review_count, detect_availability, normalize_product_name
from utils.playwright_support import can_use_playwright, run_playwright_task
from utils.proxy import proxy_manager
from utils.storage import log_scrape, upsert_product, upsert_products

BASE_URL = "https://www.flipkart.com"
SEARCH_URL = f"{BASE_URL}/search"
_PLAYWRIGHT_SUPPORT = None


def _playwright_status():
    global _PLAYWRIGHT_SUPPORT
    if _PLAYWRIGHT_SUPPORT is None:
        _PLAYWRIGHT_SUPPORT = can_use_playwright()
    return _PLAYWRIGHT_SUPPORT


def _standardize_playwright_products(products: list[dict]) -> list[dict]:
    standardized = []
    for product in products or []:
        standardized.append(
            {
                "source": "flipkart",
                "source_id": product.get("source_id") or product.get("sourceId") or product.get("id"),
                "name": product.get("name"),
                "url": product.get("url") or product.get("product_url"),
                "image": product.get("image") or product.get("image_url"),
                "current_price": product.get("current_price") or product.get("currentPrice"),
                "original_price": product.get("original_price") or product.get("originalPrice"),
                "discount_pct": product.get("discount_pct") or product.get("discountPct"),
                "rating": product.get("rating"),
                "review_count": product.get("review_count") or product.get("reviewCount") or 0,
                "currency": product.get("currency", "INR"),
                "availability": product.get("availability", "in_stock"),
                "scraped_at": product.get("scraped_at"),
            }
        )
    return [item for item in standardized if item.get("source_id") and item.get("name")]


def _build_search_url(query: str, page: int = 1) -> str:
    params = urllib.parse.urlencode(
        {
            "q": query,
            "otracker": "search",
            "page": page,
        }
    )
    return f"{SEARCH_URL}?{params}"


def _is_blocked_html(html: str) -> bool:
    if not html:
        return False

    lowered = html.lower()
    return any(
        token in lowered
        for token in [
            "flipkart recaptcha",
            "are you a human",
            "captcha",
            "confirming...",
            "/recaptcha",
        ]
    )


def _extract_pid(url: Optional[str], fallback: str) -> str:
    if url:
        match = re.search(r"[?&]pid=([A-Z0-9]+)", url)
        if match:
            return match.group(1)

        match = re.search(r"/p/([^/?]+)", url)
        if match:
            return match.group(1)

    return fallback[:40].replace(" ", "_")


def _tokenize_query(value: str) -> list[str]:
    return [token for token in re.split(r"[^a-z0-9]+", value.lower()) if len(token) >= 3]


def _filter_relevant_products(products: list[dict], query: str) -> list[dict]:
    tokens = _tokenize_query(query)
    if not tokens:
        return products

    filtered = []
    for product in products:
        haystack = " ".join(
            str(product.get(field) or "")
            for field in ["name", "brand", "category", "description"]
        ).lower()
        match_count = sum(1 for token in tokens if token in haystack)
        required_matches = 1 if len(tokens) == 1 else min(2, len(tokens))
        if match_count >= required_matches:
            filtered.append(product)

    return filtered


def _parse_search_results(html: str) -> list[dict]:
    """Parse Flipkart search results. Handles multiple layout variants."""
    soup = BeautifulSoup(html, "lxml")
    products = []

    cards = soup.select("div[data-id]") or soup.select("div._1AtVbE") or soup.select("div._13oc-S")

    for card in cards:
        try:
            name_tag = (
                card.select_one("div.RG5Slk")
                or card.select_one("div.KzDlHZ")
                or card.select_one("div._4rR01T")
                or card.select_one("a.s1Q9rs")
                or card.select_one("a.IRpwTa")
                or card.select_one("div.WKTcLC")
                or card.select_one("a[title]")
            )
            name = normalize_product_name(name_tag.get_text(" ", strip=True) if name_tag else "")
            if not name:
                continue

            link_tag = (
                card.select_one("a.k7wcnx")
                or card.select_one("a.CGtC98")
                or card.select_one("a._1fQZEK")
                or card.select_one("a.s1Q9rs")
                or card.select_one("a[href*='/p/']")
            )
            href = link_tag.get("href") if link_tag else None
            url = None
            if href:
                url = href if href.startswith("http") else BASE_URL + href

            pid = (card.get("data-id") or "").strip() or _extract_pid(url, name)

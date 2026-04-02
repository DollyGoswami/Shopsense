"""
Amazon India (amazon.in) scraper.
Strategy:
  1. Try httpx (fast, lightweight) first.
  2. Fall back to Playwright (headless browser) for JS-heavy pages.
  3. Rotate User-Agent and respect rate limits.
"""
import asyncio
import random
import re
import hashlib
from typing import Optional
from datetime import datetime, timezone

import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

from utils.headers import get_amazon_headers
from utils.parser  import clean_price, clean_rating, clean_review_count, normalize_product_name, detect_availability
from utils.storage import upsert_product, upsert_products, log_scrape
from utils.proxy   import proxy_manager

BASE_URL    = "https://www.amazon.in"
SEARCH_URL  = f"{BASE_URL}/s"


def _build_search_url(query: str, page: int = 1) -> str:
    import urllib.parse
    params = urllib.parse.urlencode({
        "k":           query,
        "page":        page,
        "ref":         "nb_sb_noss",
        "language":    "en_IN",
        "currency":    "INR",
    })
    return f"{SEARCH_URL}?{params}"


def _parse_search_results(html: str) -> list[dict]:
    """Parse Amazon search results page and extract product cards."""
    soup     = BeautifulSoup(html, "lxml")
    products = []

    # Amazon product cards: data-component-type="s-search-result"
    cards = soup.find_all("div", {"data-component-type": "s-search-result"})

    for card in cards:
        try:
            # Try to get ASIN from data attribute first
            asin = card.get("data-asin", "").strip()
            
            # Get link for fallback ASIN extraction
            link_tag = card.select_one("h2 a[href]") or card.select_one("a[href*='/dp/']")
            href = link_tag.get("href") if link_tag and link_tag.has_attr("href") else None
            
            # Fallback: extract ASIN from product URL if missing
            if not asin and href:
                match = re.search(r"/dp/([A-Z0-9]{10})", href)
                if match:
                    asin = match.group(1)
                    print(f"[Amazon] Extracted ASIN from URL: {asin}")
                else:
                    # Generate unique ID from href
                    asin = "AMZ" + hashlib.md5(href.encode()).hexdigest()[:7].upper()
                    print(f"[Amazon] Generated ASIN from href: {asin}")
            
            # Skip if ASIN is still missing or empty
            if not asin or asin == "":
                print(f"[Amazon] Skipping card - no valid ASIN")
                continue

            # Product name
            name_tag = card.select_one("h2 a span") or card.select_one("[data-cy='title-recipe'] span") or card.select_one("a span")
            name = normalize_product_name(name_tag.get_text() if name_tag else "")
            if not name:
                continue

            # URL
            link_tag = card.select_one("h2 a[href]")
            href = link_tag.get("href") if link_tag and link_tag.has_attr("href") else None
            if href:
                url = BASE_URL + href.split("?")[0]
            else:
                url = f"{BASE_URL}/dp/{asin}"

            # Price (current)
            price_whole  = card.select_one(".a-price-whole")
            price_frac   = card.select_one(".a-price-fraction")
            current_price = None
            if price_whole:
                p_str = price_whole.get_text().replace(",", "").replace(".", "")
                frac  = price_frac.get_text().strip() if price_frac else "00"
                current_price = clean_price(f"{p_str}.{frac}")

            # MRP (original price)
            mrp_tag   = card.select_one(".a-text-price span.a-offscreen")
            mrp_price = clean_price(mrp_tag.get_text() if mrp_tag else "")

            # Discount
            discount_tag = card.select_one(".a-badge-text") or card.select_one("span:-soup-contains('% off')")
            discount_pct = None
            if discount_tag:
                m = re.search(r"(\d+)\s*%", discount_tag.get_text())
                discount_pct = int(m.group(1)) if m else None
            if not discount_pct and mrp_price and current_price and mrp_price > current_price:
                discount_pct = round(((mrp_price - current_price) / mrp_price) * 100)

            # Rating
            rating_tag = card.select_one("span[aria-label*='out of']") or card.select_one("i.a-icon-star-small span")
            rating = clean_rating(rating_tag.get("aria-label", "") if rating_tag else "")

            # Review count
            reviews_tag = card.select_one("span.a-size-base.s-underline-text")
            review_count = clean_review_count(reviews_tag.get_text() if reviews_tag else "")

            # Image
            img_tag = card.select_one("img.s-image")
            image = img_tag.get("src") if img_tag and img_tag.has_attr("src") else None

            # Skip products with no price data
            if not current_price and not mrp_price:
                continue
            
            # Final validation: ensure asin is never None or empty
            if not asin or len(str(asin).strip()) == 0:
                print(f"[Amazon] Skipping product {name[:30]} - no valid sourceId")
                continue

            products.append({
                "source":         "amazon",
                "source_id":      str(asin).strip(),
                "name":           name,
                "url":            url,
                "image":          image,
                "current_price":  current_price,
                "original_price": mrp_price,
                "discount_pct":   discount_pct,
                "rating":         rating,
                "review_count":   review_count,
                "currency":       "INR",
                "availability":   "in_stock",
                "scraped_at":     datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            print(f"[Amazon] Error parsing card: {e}")
            continue

    return products

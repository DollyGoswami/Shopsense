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
  
def _parse_product_detail(html: str, asin: str) -> Optional[dict]:
    """Parse a single Amazon product detail page for full info."""
    soup = BeautifulSoup(html, "lxml")

    try:
        name_tag = soup.select_one("#productTitle")
        name = normalize_product_name(name_tag.get_text() if name_tag else "")

        # Price
        price_tag = soup.select_one(".a-price-whole") or soup.select_one("#priceblock_ourprice") or soup.select_one("#priceblock_dealprice")
        current_price = clean_price(price_tag.get_text() if price_tag else "")

        # MRP
        mrp_tag = soup.select_one("#priceblock_saleprice") or soup.select_one(".a-text-price")
        original_price = clean_price(mrp_tag.get_text() if mrp_tag else "")

        # Rating
        rating_tag = soup.select_one("#acrPopover span.a-size-base")
        rating = clean_rating(rating_tag.get_text() if rating_tag else "")

        # Reviews
        reviews_tag = soup.select_one("#acrCustomerReviewText")
        review_count = clean_review_count(reviews_tag.get_text() if reviews_tag else "")

        # Main image
        img_tag = soup.select_one("#landingImage") or soup.select_one("#imgBlkFront")
        image = None
        if img_tag:
            image = img_tag.get("data-old-hires") or img_tag.get("src")

        # Availability
        avail_tag = soup.select_one("#availability span")
        availability = detect_availability(avail_tag.get_text() if avail_tag else "")

        # Features (bullet points)
        feature_bullets = soup.select("#feature-bullets ul li span.a-list-item")
        features = [b.get_text().strip() for b in feature_bullets[:5] if b.get_text().strip()]

        # Brand
        brand_tag = soup.select_one("#bylineInfo") or soup.select_one("a#brand")
        brand = brand_tag.get_text().replace("Brand:", "").replace("Visit the", "").strip() if brand_tag else None

        # Category
        breadcrumbs = soup.select("#wayfinding-breadcrumbs_feature_div a")
        category = breadcrumbs[-1].get_text().strip() if breadcrumbs else "Electronics"

        return {
            "source":         "amazon",
            "source_id":      asin,
            "name":           name,
            "url":            f"https://www.amazon.in/dp/{asin}",
            "image":          image,
            "current_price":  current_price,
            "original_price": original_price,
            "discount_pct":   round(((original_price - current_price) / original_price) * 100) if original_price and current_price and original_price > current_price else None,
            "rating":         rating,
            "review_count":   review_count,
            "brand":          brand,
            "category":       category,
            "features":       features,
            "currency":       "INR",
            "availability":   availability,
            "scraped_at":     datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        print(f"[Amazon] Detail parse error: {e}")
        return None


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def _fetch_html(url: str) -> Optional[str]:
    """Fetch HTML with httpx + proxy support."""
    proxy = proxy_manager.get_proxy()
    headers = get_amazon_headers()

    try:
        async with httpx.AsyncClient(
            proxy=proxy,
            headers=headers,
            follow_redirects=True,
            timeout=20,
        ) as client:
            await asyncio.sleep(random.uniform(1.0, 3.0))   # polite delay
            response = await client.get(url)
            response.raise_for_status()
            return response.text
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 503:
            raise   # Trigger retry
        print(f"[Amazon] HTTP error {e.response.status_code} for {url}")
        return None
    except Exception as e:
        if proxy:
            proxy_manager.mark_bad(proxy)
        raise

async def _fetch_with_playwright(url: str) -> Optional[str]:
    """
    Fallback: use Playwright headless browser when httpx gets blocked.
    Install with: playwright install chromium
    """
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=get_amazon_headers()["User-Agent"],
                locale="en-IN",
                timezone_id="Asia/Kolkata",
            )
            page = await context.new_page()

            # Block images/fonts to speed up
            await page.route("**/*.{png,jpg,jpeg,gif,svg,woff,woff2}", lambda r: r.abort())

            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(random.randint(1500, 3000))   # human-like delay

            html = await page.content()
            await browser.close()
            return html
    except NotImplementedError as e:
        print(f"[Amazon] Playwright environment not supported: {e}")
        return None
    except Exception as e:
        print(f"[Amazon] Playwright error: {e}")
        return None


async def scrape_search(query: str, pages: int = 2) -> list[dict]:
    """
    Scrape Amazon search results for a query.
    Returns list of product dicts and saves to MongoDB.
    """
    all_products = []

    for page in range(1, pages + 1):
        url  = _build_search_url(query, page)
        print(f"[Amazon] Scraping: {url}")

        html = await _fetch_html(url)

        # Skip Playwright fallback for now due to environment issues
        # if not html or "Enter the characters you see below" in html or "api-services-support@amazon.com" in html:
        #     print("[Amazon] Blocked by CAPTCHA — using Playwright fallback")
        #     html = await _fetch_with_playwright(url)

        if not html:
            print(f"[Amazon] Failed to fetch page {page}")
            break

        products = _parse_search_results(html)
        print(f"[Amazon] Page {page}: found {len(products)} products")

        await upsert_products(products)

        all_products.extend(products)
        await asyncio.sleep(random.uniform(2.0, 5.0))   # between pages

    await log_scrape("amazon", query, len(all_products))
    return all_products


async def scrape_product(asin: str) -> Optional[dict]:
    """
    Scrape a single Amazon product detail page by ASIN.
    Example ASIN: B0CHX2FKNN (Samsung S24)
    """
    url  = f"https://www.amazon.in/dp/{asin}"
    html = await _fetch_html(url)

    if not html or "Enter the characters" in html:
        html = await _fetch_with_playwright(url)

    if not html:
        return None

    product = _parse_product_detail(html, asin)
    if product:
        await upsert_product(product)

    return product


async def scrape_products_by_asins(asins: list[str]) -> list[dict]:
    """Scrape multiple ASINs concurrently (limited concurrency)."""
    semaphore = asyncio.Semaphore(3)   # max 3 concurrent requests

    async def scrape_one(asin):
        async with semaphore:
            return await scrape_product(asin)

    results = await asyncio.gather(*[scrape_one(a) for a in asins], return_exceptions=True)
    return [r for r in results if isinstance(r, dict)]


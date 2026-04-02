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
            
            price_tag = (
                card.select_one("div.hZ3P6w")
                or card.select_one("div.Nx9bqj")
                or card.select_one("div._30jeq3")
                or card.select_one("div._25b18c ._30jeq3")
            )
            current_price = clean_price(price_tag.get_text(" ", strip=True) if price_tag else "")
            if current_price is None:
                continue

            mrp_tag = (
                card.select_one("div.yRaY8j")
                or card.select_one("div._3I9_wc")
                or card.select_one("div._25b18c ._3I9_wc")
            )
            original_price = clean_price(mrp_tag.get_text(" ", strip=True) if mrp_tag else "")

            disc_tag = card.select_one("div.UkUFwK") or card.select_one("div._3Ay6Sb") or card.select_one("div._1V_ZGU")
            discount_pct = None
            if disc_tag:
                match = re.search(r"(\d+)\s*%", disc_tag.get_text(" ", strip=True))
                discount_pct = int(match.group(1)) if match else None
            if discount_pct is None and original_price and original_price > current_price:
                discount_pct = round(((original_price - current_price) / original_price) * 100)

            rating_tag = (
                card.select_one("div.MKiFS6")
                or card.select_one("div.XQDdHH")
                or card.select_one("div._3LWZlK")
                or card.select_one("span._1lRcqv")
            )
            rating = clean_rating(rating_tag.get_text(" ", strip=True) if rating_tag else "")

            reviews_tag = (
                card.select_one("span.PvbNMB")
                or card.select_one("span.Wphh3N")
                or card.select_one("span._2_R_DZ")
                or card.select_one("span.count")
            )
            review_count = clean_review_count(reviews_tag.get_text(" ", strip=True) if reviews_tag else "")

            img_tag = (
                card.select_one("img.UCc1lI")
                or card.select_one("img.DByuf4")
                or card.select_one("img._396cs4")
                or card.select_one("img._2r_T1I")
                or card.select_one("img")
            )
            image = None
            if img_tag:
                image = img_tag.get("src") or img_tag.get("data-src")
                if image and "128/128" in image:
                    image = image.replace("128/128", "416/416")

            availability = detect_availability(card.get_text(" ", strip=True) or "in stock")

            products.append(
                {
                    "source": "flipkart",
                    "source_id": pid,
                    "name": name,
                    "url": url,
                    "image": image,
                    "current_price": current_price,
                    "original_price": original_price,
                    "discount_pct": discount_pct,
                    "rating": rating,
                    "review_count": review_count,
                    "currency": "INR",
                    "availability": availability,
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                }
            )
        except Exception as e:
            print(f"[Flipkart] Card parse error: {e}")
            continue

    return products


def _parse_product_detail(html: str, pid: str, url: str) -> Optional[dict]:
    soup = BeautifulSoup(html, "lxml")

    try:
        name_tag = soup.select_one("span.B_NuCI") or soup.select_one("h1.yhB1nd")
        name = normalize_product_name(name_tag.get_text(" ", strip=True) if name_tag else "")

        price_tag = soup.select_one("div.Nx9bqj.CxhGGd") or soup.select_one("div._30jeq3._16Jk6d")
        current_price = clean_price(price_tag.get_text(" ", strip=True) if price_tag else "")

        mrp_tag = soup.select_one("div.yRaY8j.A6+RM") or soup.select_one("div._3I9_wc._2p6lqe")
        original_price = clean_price(mrp_tag.get_text(" ", strip=True) if mrp_tag else "")

        disc_tag = soup.select_one("div.VGWI6T") or soup.select_one("div._3Ay6Sb._31Dcoz")
        discount_pct = None
        if disc_tag:
            match = re.search(r"(\d+)\s*%", disc_tag.get_text(" ", strip=True))
            discount_pct = int(match.group(1)) if match else None

        rating_tag = soup.select_one("div._3LWZlK.ior6Oa") or soup.select_one("div._3LWZlK")
        rating = clean_rating(rating_tag.get_text(" ", strip=True) if rating_tag else "")

        reviews_tag = soup.select_one("span.Wphh3N") or soup.select_one("span._2_R_DZ") or soup.select_one("span.Y1HWO0")
        review_count = clean_review_count(reviews_tag.get_text(" ", strip=True) if reviews_tag else "")

        img_tag = soup.select_one("img._396cs4") or soup.select_one("img.DByuf4") or soup.select_one("img")
        image = img_tag.get("src") if img_tag else None

        highlights = soup.select("div._2418kt li") or soup.select("ul li._21Ahn-")
        features = [item.get_text(" ", strip=True) for item in highlights[:6] if item.get_text(" ", strip=True)]

        avail_tag = soup.select_one("div._16FRp0") or soup.select_one("div[class*='stock']")
        availability = detect_availability(avail_tag.get_text(" ", strip=True) if avail_tag else "in stock")

        brand_tag = soup.select_one("span.G6XhRU") or soup.select_one("span.mEh187")
        brand = brand_tag.get_text(" ", strip=True) if brand_tag else None

        return {
            "source": "flipkart",
            "source_id": pid,
            "name": name,
            "url": url,
            "image": image,
            "current_price": current_price,
            "original_price": original_price,
            "discount_pct": discount_pct,
            "rating": rating,
            "review_count": review_count,
            "brand": brand,
            "features": features,
            "currency": "INR",
            "availability": availability,
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        print(f"[Flipkart] Detail parse error: {e}")
        return None



            if href:
                url = href if href.startswith("http") else BASE_URL + href

            pid = (card.get("data-id") or "").strip() or _extract_pid(url, name)

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
async def _fetch_html(url: str) -> Optional[str]:
    proxy = proxy_manager.get_proxy()
    try:
        async with httpx.AsyncClient(
            proxy=proxy,
            headers=get_flipkart_headers(),
            follow_redirects=True,
            timeout=20,
        ) as client:
            await asyncio.sleep(random.uniform(2.0, 4.0))
            response = await client.get(url)
            if response.status_code in {403, 429, 503}:
                return response.text
            response.raise_for_status()
            return response.text
    except Exception:
        if proxy:
            proxy_manager.mark_bad(proxy)
        raise


async def _fetch_with_playwright(url: str) -> Optional[str]:
    supported, reason = _playwright_status()
    if not supported:
        print(f"[Flipkart] Playwright unavailable: {reason}")
        return None

    try:
        from playwright.async_api import TimeoutError as PlaywrightTimeoutError
        from playwright.async_api import async_playwright

        async def _runner():
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent=get_flipkart_headers()["User-Agent"],
                    locale="en-IN",
                    timezone_id="Asia/Kolkata",
                )
                page = await context.new_page()

                try:
                    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    await page.wait_for_timeout(random.randint(2500, 4500))
                    html = await page.content()
                except PlaywrightTimeoutError:
                    html = await page.content()
                finally:
                    await browser.close()

                return html

        return await run_playwright_task(_runner)
    except NotImplementedError as e:
        print(f"[Flipkart] Playwright environment not supported: {e}")
        return None
    except Exception as e:
        print(f"[Flipkart] Playwright error: {e}")
        return None


async def scrape_search(query: str, pages: int = 2) -> list[dict]:
    all_products = []
    playwright_supported, playwright_reason = _playwright_status()

    for page in range(1, pages + 1):
        url = _build_search_url(query, page)
        print(f"[Flipkart] Scraping: {url}")

        try:
            html = await _fetch_html(url)
        except Exception as e:
            print(f"[Flipkart] HTTP fetch failed: {e}")
            html = None
        used_playwright = False

        if html and _is_blocked_html(html):
            print("[Flipkart] HTTP fetch was blocked. Trying Playwright fallback.")
            if playwright_supported:
                html = await _fetch_with_playwright(url)
                used_playwright = bool(html)
            else:
                print(f"[Flipkart] Skipping Playwright fallback: {playwright_reason}")

        products = _parse_search_results(html or "")
        if not products and not used_playwright:
            print("[Flipkart] No products found in HTTP HTML. Trying Playwright fallback.")
            if playwright_supported:
                html = await _fetch_with_playwright(url)
                products = _parse_search_results(html or "")
            else:
                print(f"[Flipkart] Skipping Playwright fallback: {playwright_reason}")

        if not products and playwright_supported:
            try:
                from scrapers import flipkart_playwright

                print("[Flipkart] HTML parsing returned no products. Trying dedicated Playwright scraper.")
                products = _standardize_playwright_products(
                    await flipkart_playwright.scrape(query, limit=max(20, pages * 20))
                )
            except Exception as e:
                print(f"[Flipkart] Dedicated Playwright fallback failed: {e}")
        elif not products:
            print(f"[Flipkart] Skipping dedicated Playwright scraper: {playwright_reason}")

        filtered_products = _filter_relevant_products(products, query)
        if products and not filtered_products:
            print(f"[Flipkart] Filtered out {len(products)} irrelevant products for query '{query}'")
        elif len(filtered_products) != len(products):
            print(f"[Flipkart] Filtered {len(products) - len(filtered_products)} weak matches for query '{query}'")

        products = filtered_products
        print(f"[Flipkart] Page {page}: {len(products)} products")

        if not html and not products:
            break

        if products:
            await upsert_products(products)

        all_products.extend(products)
        await asyncio.sleep(random.uniform(3.0, 6.0))

    await log_scrape("flipkart", query, len(all_products))
    return all_products


async def scrape_product(product_id: str, url: str) -> Optional[dict]:
    html = await _fetch_html(url)
    if html and _is_blocked_html(html):
        html = await _fetch_with_playwright(url)
    if not html:
        html = await _fetch_with_playwright(url)
    if not html:
        return None

    product = _parse_product_detail(html, product_id, url)
    if product:
        await upsert_product(product)

    return product

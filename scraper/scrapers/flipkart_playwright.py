"""
Flipkart scraper using Playwright for JavaScript rendering.
"""
import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Optional

from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright

from utils.parser import clean_price, clean_rating, clean_review_count, normalize_product_name
from utils.playwright_support import can_use_playwright, run_playwright_task
from utils.storage import log_scrape, upsert_product

logger = logging.getLogger(__name__)

BASE_URL = "https://www.flipkart.com"


async def scrape(query: str, limit: int = 20) -> list[dict]:
    """Scrape Flipkart using Playwright for rendered product cards."""
    supported, reason = can_use_playwright()
    if not supported:
        logger.warning(f"Skipping Flipkart Playwright scrape: {reason}")
        return []

    try:
        search_url = f"{BASE_URL}/search?q={query.replace(' ', '+')}"
        logger.info(f"Scraping Flipkart search: {search_url}")

        async def _runner():
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                )
                page = await context.new_page()

                await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)

                try:
                    await page.wait_for_selector("[data-id]", timeout=10000)
                except PlaywrightTimeoutError:
                    logger.warning("No Flipkart products found with [data-id] selector after timeout")
                    await browser.close()
                    return []

                for _ in range(3):
                    await page.evaluate("window.scrollBy(0, window.innerHeight)")
                    await asyncio.sleep(1)

                products_data = await page.evaluate(
                    r"""
                    () => {
                        const cards = Array.from(document.querySelectorAll('[data-id]'));

                        const pickText = (card, selectors) => {
                            for (const selector of selectors) {
                                const el = card.querySelector(selector);
                                const text = el ? el.textContent.trim() : '';
                                if (text) return text;
                            }
                            return '';
                        };

                        const pickAttr = (card, selectors, attr) => {
                            for (const selector of selectors) {
                                const el = card.querySelector(selector);
                                const value = el ? (el.getAttribute(attr) || '') : '';
                                if (value) return value;
                            }
                            return '';
                        };

                        return cards.map(card => {
                            try {
                                const id = card.getAttribute('data-id') || '';
                                const linkElem = card.querySelector('a.CGtC98, a._1fQZEK, a.s1Q9rs, a[href*="/p/"]');

                                return {
                                    id,
                                    url: linkElem ? linkElem.href : '',
                                    name: pickText(card, ['div.RG5Slk', 'div.KzDlHZ', 'div._4rR01T', 'a.s1Q9rs', 'a.IRpwTa', 'div.WKTcLC', 'a[title]']),
                                    priceText: pickText(card, ['div.hZ3P6w', 'div.Nx9bqj', 'div._30jeq3', 'div._25b18c ._30jeq3']),
                                    mrpText: pickText(card, ['div.yRaY8j', 'div._3I9_wc', 'div._25b18c ._3I9_wc']),
                                    discountText: pickText(card, ['div.UkUFwK', 'div._3Ay6Sb', 'div._1V_ZGU']),
                                    ratingText: pickText(card, ['div.MKiFS6', 'div.XQDdHH', 'div._3LWZlK', 'span._1lRcqv']),
                                    reviewText: pickText(card, ['span.PvbNMB', 'span.Wphh3N', 'span._2_R_DZ', 'span.count']),
                                    image: pickAttr(card, ['img.UCc1lI', 'img.DByuf4', 'img._396cs4', 'img._2r_T1I', 'img'], 'src')
                                        || pickAttr(card, ['img.UCc1lI', 'img.DByuf4', 'img._396cs4', 'img._2r_T1I', 'img'], 'data-src'),
                                };
                            } catch (e) {
                                return null;
                            }
                        }).filter(item => item && item.id && item.name);
                    }
                    """
                )

                await browser.close()
                return products_data

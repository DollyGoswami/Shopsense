"""
Run all enabled scrapers in parallel for a query and deduplicate results.
"""
import asyncio
import os

from scrapers.amazon import scrape_search as scrape_amazon
from scrapers.apollo_pharmacy import scrape_search as scrape_apollo
from scrapers.flipkart import scrape_search as scrape_flipkart
from scrapers.myntra import scrape_search as scrape_myntra
from utils.schema import normalize_product

MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT_SCRAPERS", 5))
SCRAPER_TIMEOUT = int(os.getenv("SCRAPER_TIMEOUT_SECS", 90))
DEFAULT_REFRESH_QUERIES = [
    q.strip()
    for q in os.getenv(
        "DEFAULT_REFRESH_QUERIES",
        "smartphone,laptop,headphones,smartwatch,tablet",
    ).split(",")
    if q.strip()
]

SCRAPER_MAP = {
    "amazon": scrape_amazon,
    "flipkart": scrape_flipkart,
    "myntra": scrape_myntra,
    "apollo_pharmacy": scrape_apollo,
}

semaphore = asyncio.Semaphore(MAX_CONCURRENT)


async def run_limited(scraper, query, pages):
    async with semaphore:
        try:
            result = await asyncio.wait_for(scraper(query, pages), timeout=SCRAPER_TIMEOUT)
            return result
        except asyncio.TimeoutError:
            scraper_name = getattr(scraper, "__name__", "unknown")
            print(f"[Scraper Timeout] {scraper_name} exceeded {SCRAPER_TIMEOUT}s timeout")
            return []
        except Exception as e:
            scraper_name = getattr(scraper, "__name__", "unknown")
            print(f"[Scraper Error] {scraper_name}: {e}")
            return []

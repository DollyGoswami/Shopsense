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


async def scrape_all_platforms(query, pages=2, sources=None):
    selected_sources = []
    for source_name in sources or ["amazon", "flipkart", "myntra", "apollo_pharmacy"]:
        normalized_source = source_name.strip().lower()
        if normalized_source in SCRAPER_MAP and normalized_source not in selected_sources:
            selected_sources.append(normalized_source)

    tasks = [run_limited(SCRAPER_MAP[source_name], query, pages) for source_name in selected_sources]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    deduped_products = {}
    for source_result, source_name in zip(results, selected_sources):
        if isinstance(source_result, Exception):
            print(f"[Orchestrator] {source_name} failed: {source_result}")
            continue

        for product in source_result:
            normalized = normalize_product(product, source_name)
            deduped_products[normalized["product_id"]] = normalized

    return list(deduped_products.values())


async def refresh_all_default_queries(pages=1):
    refreshed = []

    for query in DEFAULT_REFRESH_QUERIES:
        try:
            results = await scrape_all_platforms(query, pages)
            refreshed.append({"query": query, "count": len(results)})
        except Exception as e:
            print(f"[Refresh] {query} failed: {e}")
            refreshed.append({"query": query, "count": 0, "error": str(e)})

    return refreshed


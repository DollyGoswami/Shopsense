"""
ShopSense Scraper Service - FastAPI
Port: 8002

Endpoints:
  GET  /health
  POST /scrape/search        - scrape all platforms for a query
  POST /scrape/amazon/{asin} - scrape single Amazon product
  GET  /products             - list scraped products from DB
  GET  /products/{id}/price-history
  POST /scrape/refresh       - trigger manual full refresh
"""
import asyncio
import os
import sys
from contextlib import asynccontextmanager
from datetime import date, datetime
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from scheduler.cron import start_scheduler, stop_scheduler
from scrapers import amazon
from scrapers.orchestrator import refresh_all_default_queries, scrape_all_platforms
from utils.cache import get_cache, set_cache
from utils.storage import (
    ensure_indexes,
    get_price_history,
    get_products_by_query,
    upsert_products,
)

load_dotenv()
ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8001")

if sys.platform.startswith("win") and hasattr(asyncio, "WindowsProactorEventLoopPolicy"):
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())


def _make_json_safe(value):
    if isinstance(value, dict):
        return {key: _make_json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_make_json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [_make_json_safe(item) for item in value]
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    start_scheduler()
    print("[Scraper Service] Started on port 8002")
    print(f"[Scraper Service] ML Service: {ML_SERVICE_URL}")
    yield
    stop_scheduler()
    print("[Scraper Service] Stopped")


app = FastAPI(
    title="ShopSense Scraper API",
    version="1.0.0",
    description="Real-time product scraper for Amazon, Flipkart, Myntra, and Apollo Pharmacy",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Models
class SearchRequest(BaseModel):
    query: str
    pages: int = 1
    sources: Optional[list[str]] = None


async def _scrape_and_score(query: str, pages: int, sources: Optional[list[str]] = None):
    """Scrape platforms, score via ML, and persist both raw and scored results."""
    products = await scrape_all_platforms(query, pages, sources)
    scored_products = products

    if products:
        try:
            ml_products = _make_json_safe(products)
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{ML_SERVICE_URL}/recommend",
                    json={"products": ml_products, "user": {}, "limit": len(products)},
                    timeout=30,
                )
                response.raise_for_status()
                scored_products = response.json().get("products", products)
        except Exception as exc:
            print("[Scraper] ML scoring failed:", exc)
            scored_products = products

    try:
        await upsert_products(scored_products)
    except Exception as exc:
        print("[Scraper] Upsert scored products failed:", exc)

    return scored_products


# Routes
@app.get("/health")
async def health():
    return {"status": "ok", "service": "scraper"}


@app.post("/scrape/search")
async def scrape_search(req: SearchRequest, background_tasks: BackgroundTasks):
    """
    Scrape all e-commerce platforms for a query.
    Returns immediately with queued status; results are saved to DB.
    """
    query = req.query.strip()
    pages = max(1, min(req.pages, 5))
    sources = req.sources or None
    if len(query) < 3:
        raise HTTPException(status_code=400, detail="Query must be at least 3 characters long")

    background_tasks.add_task(_scrape_and_score, query, pages, sources)
    return {
        "status": "queued",
        "query": query,
        "pages": pages,
        "sources": sources,
        "message": f"Scraping started for '{query}' across all platforms. Results will be in DB shortly.",
    }


@app.post("/scrape/search/sync")
async def scrape_search_sync(req: SearchRequest):
    query = req.query.strip()
    pages = max(1, min(req.pages, 5))
    sources = req.sources or None
    if len(query) < 3:
        raise HTTPException(status_code=400, detail="Query must be at least 3 characters long")

    cache_key = f"{query}:{pages}:{','.join(sorted(sources)) if sources else 'all'}"
    cached = get_cache(cache_key)
    if cached:
        return cached

    results = await _scrape_and_score(query, pages, sources)
    set_cache(cache_key, results)
    return results


@app.post("/scrape/amazon/{asin}")
async def scrape_amazon_product(asin: str):
    """Scrape a specific Amazon product by ASIN."""
    product = await amazon.scrape_product(asin)
    if not product:
        raise HTTPException(status_code=404, detail=f"Could not scrape ASIN: {asin}")
    return product


@app.get("/products")
async def get_products(
    query: str = Query(..., description="Search query"),
    source: Optional[str] = Query(None, description="Filter by source: amazon|flipkart|myntra|apollo_pharmacy"),
    limit: int = Query(20, le=100),
):
    """Retrieve scraped products from MongoDB."""
    products = await get_products_by_query(query, source, limit)
    for product in products:
        product["_id"] = str(product["_id"])
    return {"count": len(products), "products": products}


@app.get("/products/{source}/{source_id}/price-history")
async def get_product_price_history(source: str, source_id: str, days: int = 90):
    """Get price history for a product."""
    history = await get_price_history(source, source_id, days)
    for entry in history:
        entry["_id"] = str(entry["_id"])
    return {"count": len(history), "history": history}


@app.post("/scrape/refresh")
async def trigger_refresh(background_tasks: BackgroundTasks):
    """Manually trigger a full refresh of all default queries."""
    background_tasks.add_task(refresh_all_default_queries, 1)
    return {"status": "queued", "message": "Full refresh started in background"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("SCRAPER_PORT", 8002))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

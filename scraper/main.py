"""
ShopSense Scraper Service — FastAPI
Port: 8002

Endpoints:
  GET  /health
  POST /scrape/search       — scrape all platforms for a query
  POST /scrape/amazon/{asin}— scrape single Amazon product
  GET  /products            — list scraped products from DB
  GET  /products/{id}/price-history
  POST /scrape/refresh      — trigger manual full refresh
"""
import asyncio
import httpx
import os
import sys
from contextlib import asynccontextmanager
from datetime import date, datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from utils.cache import get_cache, set_cache
from scrapers.orchestrator import scrape_all_platforms, refresh_all_default_queries
from scrapers              import amazon
from utils.storage         import get_products_by_query, get_price_history, ensure_indexes, upsert_product, upsert_products
from scheduler.cron        import start_scheduler, stop_scheduler

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
    # Startup
    await ensure_indexes()
    start_scheduler()
    print("[Scraper Service] 🚀 Started on port 8002")
    print(f"[Scraper Service] ML Service: {ML_SERVICE_URL}")
    yield
    # Shutdown
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


# ── Models ──────────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query:  str
    pages:  int = 1
    sources: Optional[list[str]] = None  # filter to specific sources


async def _scrape_and_score(query: str, pages: int, sources: Optional[list[str]] = None):
    """Scrape platforms, score via ML, and persist both raw + scored results."""
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
        except Exception as e:
            print("[Scraper] ML scoring failed:", e)
            scored_products = products

    # Upsert scored documents so backend search sees the finalScore immediately
    try:
        await upsert_products(scored_products)
    except Exception as e:
        print("[Scraper] Upsert scored products failed:", e)

    return scored_products


# ── Routes ──────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "scraper"}


@app.post("/scrape/search")
async def scrape_search(req: SearchRequest, background_tasks: BackgroundTasks):
    """
    Scrape all e-commerce platforms for a query.
    Returns immediately with queued status; results saved to DB.
    Use GET /products?query=... to retrieve results.
    """
    query = req.query.strip()
    pages = max(1, min(req.pages, 5))  # Page cap to avoid too-heavy scraping
    sources = req.sources or None
    if len(query) < 3:
        raise HTTPException(status_code=400, detail="Query must be at least 3 characters long")

    background_tasks.add_task(_scrape_and_score, query, pages, sources)
    return {
        "status":  "queued",
        "query":   query,
        "pages":   pages,
        "sources": sources,
        "message": f"Scraping started for '{query}' across all platforms. Results will be in DB shortly."
    }


@app.post("/scrape/search/sync")
async def scrape_search_sync(req: SearchRequest):
    query = req.query.strip()
    pages = max(1, min(req.pages, 5))  # Page cap to avoid too-heavy scraping
    sources = req.sources or None
    if len(query) < 3:
        raise HTTPException(status_code=400, detail="Query must be at least 3 characters long")

    cache_key = f"{query}:{pages}:{','.join(sorted(sources)) if sources else 'all'}"

    cached = get_cache(cache_key)
    if cached:
        return cached

    # 1. scrape, score, and persist
    results = await _scrape_and_score(query, pages, sources)

    # 2. cache
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
    # Convert ObjectId to string
    for p in products:
        p["_id"] = str(p["_id"])
    return {"count": len(products), "products": products}


@app.get("/products/{source}/{source_id}/price-history")
async def get_product_price_history(source: str, source_id: str, days: int = 90):
    """Get price history for a product."""
    history = await get_price_history(source, source_id, days)
    for h in history:
        h["_id"] = str(h["_id"])
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

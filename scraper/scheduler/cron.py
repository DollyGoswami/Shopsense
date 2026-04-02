"""
APScheduler-based cron scheduler.
Refreshes product data every N minutes automatically.
"""
import os
import asyncio
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval  import IntervalTrigger
from dotenv import load_dotenv
from scrapers.orchestrator import refresh_all_default_queries

load_dotenv()

INTERVAL_MINUTES = int(os.getenv("SCRAPE_INTERVAL_MINUTES", "30"))

scheduler = AsyncIOScheduler()


async def _run_refresh():
    print(f"\n[Scheduler] ⏰ Auto-refresh started at {datetime.now().isoformat()}")
    try:
        await refresh_all_default_queries(pages=1)
    except Exception as e:
        print(f"[Scheduler] Error: {e}")
    print(f"[Scheduler] ✅ Auto-refresh completed at {datetime.now().isoformat()}")


def start_scheduler():
    """Start background scraping scheduler."""
    scheduler.add_job(
        _run_refresh,
        trigger=IntervalTrigger(minutes=INTERVAL_MINUTES),
        id="product_refresh",
        name="Refresh all products",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=300,
    )
    scheduler.start()
    print(f"[Scheduler] Started — will refresh every {INTERVAL_MINUTES} minutes")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("[Scheduler] Stopped")

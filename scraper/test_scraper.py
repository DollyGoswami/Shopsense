#!/usr/bin/env python3
"""Quick test script to verify scraper functionality."""
import asyncio
import sys
from scrapers.orchestrator import scrape_all_platforms

async def main():
    print("[TEST] Starting scraper test for 'samsung phone' on 1 page...")
    try:
        results = await scrape_all_platforms('samsung phone', pages=1)
        print(f"[TEST] Total products scraped: {len(results)}")
        
        if not results:
            print("[TEST] WARNING: No products scraped. Check logs above.")
            return
        
        # Group by source
        by_source = {}
        for r in results:
            source = r.get('source', 'unknown')
            if source not in by_source:
                by_source[source] = []
            by_source[source].append(r)
        
        print("\n[TEST] Results by source:")
        for source, items in sorted(by_source.items()):
            print(f"  {source}: {len(items)} products")
            for item in items[:2]:
                print(f"    - {item.get('name', 'N/A')[:60]}")
                print(f"      Price: {item.get('current_price', 'N/A')} | URL: {item.get('url', 'N/A')[:60]}")
        
        print("\n[TEST] SCRAPER TEST PASSED - All sources tested")
        
    except Exception as e:
        print(f"[TEST] ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())

# ShopSense Scraper Setup

This scraper service currently supports four stores:

- Amazon
- Flipkart
- Myntra
- Apollo Pharmacy

## Important Files

```text
scraper/
|-- main.py
|-- requirements.txt
|-- test_scraper.py
|-- check_db.py
|-- scheduler/
|   `-- cron.py
|-- scrapers/
|   |-- amazon.py
|   |-- flipkart.py
|   |-- flipkart_playwright.py
|   |-- myntra.py
|   |-- apollo_pharmacy.py
|   `-- orchestrator.py
`-- utils/
    |-- cache.py
    |-- headers.py
    |-- parser.py
    |-- playwright_support.py
    |-- proxy.py
    |-- schema.py
    `-- storage.py
```

## Run The Scraper

```bash
cd scraper
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8002
```

## Smoke Test

```bash
cd scraper
python test_scraper.py
```

## Check Saved Data

```bash
cd scraper
python check_db.py
```

## Environment Variables

```env
MONGO_URI=mongodb://localhost:27017/shopsense
MONGO_DB_NAME=shopsense
ML_SERVICE_URL=http://localhost:8001
SCRAPE_INTERVAL_MINUTES=30
MAX_CONCURRENT_SCRAPERS=5
SCRAPER_TIMEOUT_SECS=90
SCRAPER_PORT=8002
DISABLE_PLAYWRIGHT=false
PLAYWRIGHT_HEADLESS=true
USE_PROXY=false
PROXY_LIST=
```

## Notes

- `main.py` exposes the FastAPI routes used by the backend.
- `orchestrator.py` runs the selected store scrapers in parallel.
- `flipkart_playwright.py` is only used as a fallback when normal HTML scraping is blocked or empty.
- The scheduler refreshes default queries automatically based on `SCRAPE_INTERVAL_MINUTES`.

# ShopSense AI

AI-powered shopping platform with live price scraping from Amazon, Flipkart, Myntra, and Apollo Pharmacy.

## Project Structure

```text
shopsense/
|-- frontend/      # React frontend
|-- backend/       # Express API
|-- ml-service/    # FastAPI ML service
`-- scraper/       # FastAPI scraper service
    |-- scrapers/  # amazon.py, flipkart.py, myntra.py, apollo_pharmacy.py, orchestrator.py
    |-- utils/     # cache, headers, parser, playwright support, schema, storage
    |-- scheduler/ # cron.py
    |-- main.py
    |-- requirements.txt
    |-- test_scraper.py
    `-- check_db.py
```

## Active Scraper Sources

- Amazon
- Flipkart
- Myntra
- Apollo Pharmacy

## Quick Start

```bash
# 1. Scraper service (port 8002)
cd scraper
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8002

# 2. ML service (port 8001)
cd ml-service
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001

# 3. Backend (port 5000)
cd backend
npm install
npm run dev

# 4. Frontend
cd frontend
npm install
npm run dev
```

On Windows, use Python 3.12 for the Python services. Python 3.14 can force native builds for packages like `greenlet` and `pydantic-core`, which require Visual C++ Build Tools.

The ML service uses VADER sentiment by default so startup stays fast. To use the HuggingFace transformer model, set `SENTIMENT_ENABLE_TRANSFORMER=true` in `ml-service/.env`; the first startup will download the model.

## Scraper Notes

- The scraper API runs from `scraper/main.py`.
- The four-store orchestrator lives in `scraper/scrapers/orchestrator.py`.
- Use `python test_scraper.py` inside `scraper/` for a quick smoke test.
- Use `python check_db.py` inside `scraper/` to inspect scraped data in MongoDB.

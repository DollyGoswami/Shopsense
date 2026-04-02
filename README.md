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
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8002

# 2. ML service (port 8001)
cd ml-service
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8001

# 3. Backend (port 5000)
cd backend
npm install
npm run dev

# 4. Frontend
cd frontend
npm install
npm run dev
```

## Scraper Notes

- The scraper API runs from `scraper/main.py`.
- The four-store orchestrator lives in `scraper/scrapers/orchestrator.py`.
- Use `python test_scraper.py` inside `scraper/` for a quick smoke test.
- Use `python check_db.py` inside `scraper/` to inspect scraped data in MongoDB.

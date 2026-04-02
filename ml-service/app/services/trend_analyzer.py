"""
Trend Analyzer
Fetches product mention trends from public APIs.
Sources:
  - Twitter/X API v2 (requires bearer token)
  - Google Trends via pytrends
  - Fallback: keyword frequency analysis from scraped data
"""
import os
import asyncio
import httpx
from datetime import datetime, timezone
from typing import Optional

TWITTER_BEARER = os.getenv("TWITTER_BEARER_TOKEN", "")


async def get_twitter_trend_score(keyword: str) -> Optional[dict]:
    """
    Query Twitter API v2 for recent tweet count about a product.
    Requires TWITTER_BEARER_TOKEN in .env
    """
    if not TWITTER_BEARER:
        return None

    try:
        url    = "https://api.twitter.com/2/tweets/counts/recent"
        params = {
            "query":       f"{keyword} lang:en -is:retweet",
            "granularity": "day",
        }
        headers = {"Authorization": f"Bearer {TWITTER_BEARER}"}

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        daily_counts = [d["tweet_count"] for d in data.get("data", [])]
        if not daily_counts:
            return None

        total        = sum(daily_counts)
        recent_avg   = sum(daily_counts[-3:]) / max(1, len(daily_counts[-3:]))
        overall_avg  = total / len(daily_counts)

        # Trend velocity: are mentions growing?
        velocity     = recent_avg / max(1, overall_avg)

        # Normalize score to 0–100
        # >5000 daily mentions = 100, <100 = 10
        base_score   = min(100, (recent_avg / 50))
        velocity_boost = min(20, (velocity - 1) * 20) if velocity > 1 else 0
        score        = min(100, base_score + velocity_boost)

        return {
            "keyword":      keyword,
            "total_7d":     total,
            "recent_avg":   round(recent_avg, 1),
            "velocity":     round(velocity, 2),
            "trend_score":  round(score, 1),
            "source":       "twitter",
            "timestamp":    datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        print(f"[Trends] Twitter API error for '{keyword}': {e}")
        return None


def _estimate_trend_from_scraped_data(product: dict) -> float:
    """
    Estimate trend score from scraped product metadata when
    external APIs are unavailable.
    Factors: review velocity, discount frequency, price volatility.
    """
    score = 40.0  # baseline

    # High review count = popular product
    reviews = product.get("review_count") or 0
    if reviews > 50000:
        score += 25
    elif reviews > 10000:
        score += 15
    elif reviews > 1000:
        score += 8

    # Large discount often signals promotional push = trending
    discount = product.get("discount_pct") or 0
    if discount >= 40:
        score += 15
    elif discount >= 20:
        score += 8

    # High overall rating = well-regarded = more likely being discussed
    rating = product.get("rating") or 0
    if rating >= 4.5:
        score += 10
    elif rating >= 4.0:
        score += 5

    return round(min(100, max(0, score)), 1)


async def compute_trend_score(product: dict) -> float:
    """
    Main entry point: compute trend score for a product.
    Tries Twitter API, falls back to heuristic estimation.
    """
    # Build search keyword from product name (first 3–4 words)
    name    = product.get("name") or ""
    keyword = " ".join(name.split()[:4])

    twitter_data = await get_twitter_trend_score(keyword)
    if twitter_data:
        return twitter_data["trend_score"]

    # Fallback
    return _estimate_trend_from_scraped_data(product)

async def compute_trend_scores_batch(products: list[dict]) -> dict:
    """
    Compute trend scores for multiple products concurrently.
    Returns dict of {product_id: trend_score}
    """
    semaphore = asyncio.Semaphore(5)

    async def score_one(p):
        async with semaphore:
            pid   = str(p.get("_id") or p.get("source_id", ""))
            score = await compute_trend_score(p)
            return pid, score

    results = await asyncio.gather(*[score_one(p) for p in products])
    return dict(results)


def detect_trend_decay(daily_counts: list[int]) -> dict:
    """
    Predict when a trend will decay.
    Returns: {decaying: bool, days_until_decay: int, confidence: float}
    """
    if len(daily_counts) < 5:
        return {"decaying": False, "days_until_decay": None, "confidence": 0.0}

    import numpy as np
    x = np.arange(len(daily_counts), dtype=float)
    y = np.array(daily_counts, dtype=float)

    # Linear fit to detect declining slope
    x_m, y_m = x.mean(), y.mean()
    b = np.sum((x - x_m) * (y - y_m)) / (np.sum((x - x_m) ** 2) + 1e-9)

    decaying = b < -10  # declining by >10 mentions/day

    # Estimate days until trend hits baseline (20% of peak)
    if decaying and y_m > 0:
        peak   = max(y)
        target = peak * 0.2
        current = y[-1]
        if b < 0 and current > target:
            days_until = int((current - target) / abs(b))
        else:
            days_until = 0
    else:
        days_until = None

    # Confidence based on R²
    y_pred    = x_m + b * (x - x_m) + y_m
    ss_res    = np.sum((y - y_pred) ** 2)
    ss_tot    = np.sum((y - y_m) ** 2) + 1e-9
    r_squared = max(0, 1 - ss_res / ss_tot)

    return {
        "decaying":          decaying,
        "days_until_decay":  days_until,
        "slope":             round(float(b), 2),
        "confidence":        round(float(r_squared), 3),
    }



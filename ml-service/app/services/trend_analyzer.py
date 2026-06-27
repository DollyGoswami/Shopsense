"""
Trend Analyzer
Fetches product mention trends from public APIs.
Sources:
  - Twitter/X API v2 (requires bearer token)
  - Fallback: keyword frequency analysis from scraped data
"""
import asyncio
import os
from datetime import datetime, timezone
from typing import Optional

import httpx

TWITTER_BEARER = os.getenv("TWITTER_BEARER_TOKEN", "")


def _normalize_keyword(keyword: str) -> str:
    return " ".join(str(keyword or "").split()).strip()


async def get_twitter_trend_score(keyword: str) -> Optional[dict]:
    """
    Query Twitter API v2 for recent tweet counts about a keyword.
    Requires TWITTER_BEARER_TOKEN in .env.
    """
    keyword = _normalize_keyword(keyword)
    if not TWITTER_BEARER or not keyword:
        return None

    try:
        url = "https://api.twitter.com/2/tweets/counts/recent"
        params = {
            "query": f"{keyword} lang:en -is:retweet",
            "granularity": "day",
        }
        headers = {"Authorization": f"Bearer {TWITTER_BEARER}"}

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()

        daily_counts = [item["tweet_count"] for item in data.get("data", [])]
        if not daily_counts:
            return None

        total = sum(daily_counts)
        recent_avg = sum(daily_counts[-3:]) / max(1, len(daily_counts[-3:]))
        overall_avg = total / len(daily_counts)
        velocity = recent_avg / max(1, overall_avg)

        base_score = min(100, recent_avg / 50)
        velocity_boost = min(20, (velocity - 1) * 20) if velocity > 1 else 0
        score = min(100, base_score + velocity_boost)

        return {
            "keyword": keyword,
            "total_7d": total,
            "recent_avg": round(recent_avg, 1),
            "velocity": round(velocity, 2),
            "trend_score": round(score, 1),
            "source": "twitter",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        print(f"[Trends] Twitter API error for '{keyword}': {exc}")
        return None


def _estimate_trend_from_scraped_data(product: dict) -> float:
    score = 40.0

    reviews = product.get("review_count") or product.get("reviewCount") or 0
    if reviews > 50000:
        score += 25
    elif reviews > 10000:
        score += 15
    elif reviews > 1000:
        score += 8

    discount = product.get("discount_pct") or product.get("discountPct") or 0
    if discount >= 40:
        score += 15
    elif discount >= 20:
        score += 8

    rating = product.get("rating") or 0
    if rating >= 4.5:
        score += 10
    elif rating >= 4.0:
        score += 5

    return round(min(100, max(0, score)), 1)


def build_fallback_trend_signal(keyword: str, products: Optional[list[dict]] = None) -> dict:
    normalized_keyword = _normalize_keyword(keyword)
    related_products = list(products or [])
    heuristic_scores = [_estimate_trend_from_scraped_data(product) for product in related_products]
    mentions = sum(
        int(product.get("review_count") or product.get("reviewCount") or 0)
        for product in related_products
    )

    avg_score = sum(heuristic_scores) / len(heuristic_scores) if heuristic_scores else 35.0
    recent_avg = mentions / max(1, min(len(related_products), 7)) if mentions else 0

    return {
        "keyword": normalized_keyword,
        "total_7d": mentions,
        "recent_avg": round(recent_avg, 1),
        "velocity": 1.0,
        "trend_score": round(min(100, max(0, avg_score)), 1),
        "source": "fallback",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def compute_trend_score(product: dict) -> float:
    name = product.get("name") or ""
    keyword = " ".join(name.split()[:4])

    twitter_data = await get_twitter_trend_score(keyword)
    if twitter_data:
        return twitter_data["trend_score"]

    return _estimate_trend_from_scraped_data(product)


async def compute_trend_scores_batch(products: list[dict]) -> dict:
    semaphore = asyncio.Semaphore(5)

    async def score_one(product):
        async with semaphore:
            product_id = str(product.get("_id") or product.get("source_id", ""))
            score = await compute_trend_score(product)
            return product_id, score

    results = await asyncio.gather(*[score_one(product) for product in products])
    return dict(results)


async def get_trend_signals(
    keywords: list[str],
    keyword_products: Optional[dict[str, list[dict]]] = None,
    limit: int = 6,
) -> list[dict]:
    normalized_keywords = []
    seen = set()
    for keyword in keywords:
        normalized = _normalize_keyword(keyword)
        lowered = normalized.lower()
        if not normalized or lowered in seen:
            continue
        seen.add(lowered)
        normalized_keywords.append(normalized)

    if not normalized_keywords:
        return []

    semaphore = asyncio.Semaphore(4)

    async def load_signal(keyword: str):
        async with semaphore:
            twitter_data = await get_twitter_trend_score(keyword)
            if twitter_data:
                return twitter_data
            related_products = (keyword_products or {}).get(keyword.lower(), [])
            return build_fallback_trend_signal(keyword, related_products)

    signals = await asyncio.gather(*[load_signal(keyword) for keyword in normalized_keywords])
    ranked = sorted(
        [signal for signal in signals if signal],
        key=lambda item: (item.get("trend_score", 0), item.get("recent_avg", 0), item.get("total_7d", 0)),
        reverse=True,
    )
    return ranked[:limit]


def detect_trend_decay(daily_counts: list[int]) -> dict:
    if len(daily_counts) < 5:
        return {"decaying": False, "days_until_decay": None, "confidence": 0.0}

    import numpy as np

    x = np.arange(len(daily_counts), dtype=float)
    y = np.array(daily_counts, dtype=float)

    x_m, y_m = x.mean(), y.mean()
    slope = np.sum((x - x_m) * (y - y_m)) / (np.sum((x - x_m) ** 2) + 1e-9)

    decaying = slope < -10

    if decaying and y_m > 0:
        peak = max(y)
        target = peak * 0.2
        current = y[-1]
        if slope < 0 and current > target:
            days_until = int((current - target) / abs(slope))
        else:
            days_until = 0
    else:
        days_until = None

    y_pred = x_m + slope * (x - x_m) + y_m
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - y_m) ** 2) + 1e-9
    r_squared = max(0, 1 - ss_res / ss_tot)

    return {
        "decaying": decaying,
        "days_until_decay": days_until,
        "slope": round(float(slope), 2),
        "confidence": round(float(r_squared), 3),
    }

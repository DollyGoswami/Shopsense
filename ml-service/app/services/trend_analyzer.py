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


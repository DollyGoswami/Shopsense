"""
Hybrid Recommendation Model
Final Score = 0.25×Price + 0.25×Sentiment + 0.20×Rating + 0.15×Trend + 0.15×Deal

Also handles:
- Hype vs Quality detection
- Personalization by user preferences
- Buy/Wait/Avoid decision
"""
from typing import Optional


# ── Score normalization helpers ───────────────────────────────────────────────

def _normalize_rating(rating: Optional[float], max_rating: float = 5.0) -> float:
    """Convert 0–5 rating to 0–100 score."""
    if rating is None:
        return 50.0
    return round(min(100.0, (rating / max_rating) * 100), 1)


def _normalize_review_count(count: Optional[int]) -> float:
    """
    Review count contributes to confidence of sentiment score.
    More reviews = more reliable. Caps at 10,000.
    """
    if not count:
        return 0.5
    return min(1.0, count / 10000)


def _compute_deal_score(
    current_price: Optional[float],
    original_price: Optional[float],
    discount_pct: Optional[float],
) -> float:
    """
    Deal score based on discount percentage.
    0% off → 30,  10% off → 45,  30% off → 70,  50%+ off → 95
    """
    if discount_pct is not None:
        d = float(discount_pct)
    elif current_price and original_price and original_price > 0:
        d = ((original_price - current_price) / original_price) * 100
    else:
        return 30.0

    # Piecewise mapping
    if d <= 0:
        return 20.0
    elif d <= 10:
        return 30.0 + d * 1.5
    elif d <= 30:
        return 45.0 + (d - 10) * 1.25
    elif d <= 50:
        return 70.0 + (d - 30) * 1.25
    else:
        return min(98.0, 95.0 + (d - 50) * 0.06)


def _compute_hype_label(trend_score: float, sentiment_score: float) -> str:
    """
    Hype vs Quality detector.
    High trend + low sentiment → avoid (hyped but bad quality)
    Low trend + high sentiment → gem (hidden gem)
    High trend + high sentiment → hot (genuinely good and popular)
    """
    if trend_score >= 70 and sentiment_score < 55:
        return "avoid"
    elif trend_score < 50 and sentiment_score >= 75:
        return "gem"
    elif trend_score >= 70 and sentiment_score >= 70:
        return "hot"
    else:
        return "neutral"


def _compute_buy_decision(
    price_score: float,
    trend_score: float,
    deal_score: float,
    price_trend: Optional[str],   # "up" | "down" | "stable"
    final_score: float,
) -> str:
    """
    BUY / WAIT / AVOID decision logic.
    """
    # Strong AVOID
    if final_score < 35:
        return "AVOID"

    # Price going down → might be worth waiting
    if price_trend == "down" and price_score < 60:
        return "WAIT"

    # Good deal + high overall score → BUY
    if final_score >= 70 and deal_score >= 60:
        return "BUY"

    # Price rising → buy now before it gets more expensive
    if price_trend == "up" and final_score >= 55:
        return "BUY"

    # Middle ground
    if final_score >= 55:
        return "BUY"

    return "WAIT"


# ── Main scoring function ─────────────────────────────────────────────────────

def score_product(product: dict, price_history: list[dict] = None) -> dict:
    """
    Compute all scores for a single product.

    Args:
        product:       dict with keys: current_price, original_price,
                       discount_pct, rating, review_count,
                       sentiment_score (0–1), trend_score (0–100)
        price_history: list of {price, timestamp} dicts

    Returns:
        dict with all scores + buy_decision + hype_label + final_score
    """
    from app.models.price_predictor import compute_price_score, predict_prices

    # ── Individual scores ──────────────────────────────────────────────────────
    price_score = compute_price_score(
        current_price=product.get("current_price") or 0,
        original_price=product.get("original_price"),
        price_history=price_history or [],
    )

    # Sentiment: already 0–100 (multiply raw 0–1 by 100)
    raw_sentiment   = product.get("sentiment_score", 0.5)
    sentiment_score = round(float(raw_sentiment) * 100 if raw_sentiment <= 1.0 else raw_sentiment, 1)
    sentiment_score = min(100.0, max(0.0, sentiment_score))

    # Boost sentiment by review count confidence
    review_confidence = _normalize_review_count(product.get("review_count"))
    sentiment_score   = round(sentiment_score * (0.7 + 0.3 * review_confidence), 1)

    # Rating score
    rating_score = _normalize_rating(product.get("rating"))

    # Trend score (provided externally by social media analysis, 0–100)
    trend_score = float(product.get("trend_score", 50.0))
    trend_score = min(100.0, max(0.0, trend_score))

    # Deal score
    deal_score = _compute_deal_score(
        current_price=product.get("current_price"),
        original_price=product.get("original_price"),
        discount_pct=product.get("discount_pct"),
    )

    # ── Hybrid final score ────────────────────────────────────────────────────
    final_score = round(
        0.25 * price_score
        + 0.25 * sentiment_score
        + 0.20 * rating_score
        + 0.15 * trend_score
        + 0.15 * deal_score,
        1,
    )

    # ── Price prediction ──────────────────────────────────────────────────────
    price_prediction = {}
    price_trend      = "stable"
    if price_history:
        price_prediction = predict_prices(price_history, days_ahead=7)
        price_trend      = price_prediction.get("trend", "stable")

    # ── Derived labels ────────────────────────────────────────────────────────
    hype_label   = _compute_hype_label(trend_score, sentiment_score)
    buy_decision = _compute_buy_decision(
        price_score, trend_score, deal_score, price_trend, final_score
    )

    return {
        "scores": {
            "priceScore":     price_score,
            "sentimentScore": sentiment_score,
            "ratingScore":    rating_score,
            "trendScore":     trend_score,
            "dealScore":      deal_score,
            "finalScore":     final_score,
        },
        "buyDecision":    buy_decision,
        "hypeLabel":      hype_label,
        "pricePrediction": price_prediction,
    }


def score_and_rank(products: list[dict], price_histories: dict = None) -> list[dict]:
    """
    Score and rank a list of products.

    Args:
        products:        list of product dicts
        price_histories: dict of {source_id: [price_history_records]}

    Returns:
        products sorted by final_score descending, each with scores injected
    """
    scored = []
    for p in products:
        key     = p.get("source_id") or str(p.get("_id", ""))
        history = (price_histories or {}).get(key, [])
        result  = score_product(p, history)
        scored.append({**p, **result})

    # Sort by final score
    scored.sort(key=lambda x: x["scores"]["finalScore"], reverse=True)
    return scored


def apply_user_personalization(
    products: list[dict],
    user_preferences: dict,
) -> list[dict]:
    """
    Adjust scores based on user budget and category preferences.
    """
    budget_max  = user_preferences.get("budgetMax", float("inf"))
    budget_min  = user_preferences.get("budgetMin", 0)
    fav_cats    = [c.lower() for c in user_preferences.get("categories", [])]
    fav_brands  = [b.lower() for b in user_preferences.get("brands", [])]

    for p in products:
        price    = p.get("current_price") or 0
        category = (p.get("category") or "").lower()
        brand    = (p.get("brand") or "").lower()

        boost = 0.0

        # Budget match boost
        if budget_min <= price <= budget_max:
            boost += 5.0

        # Category preference boost
        if any(c in category for c in fav_cats):
            boost += 8.0

        # Brand preference boost
        if any(b in brand for b in fav_brands):
            boost += 6.0

        # Apply boost (capped at 100)
        if boost and "scores" in p:
            p["scores"]["finalScore"] = min(100.0, p["scores"]["finalScore"] + boost)
            p["scores"]["personalizedBoost"] = boost

    # Re-sort after personalization
    products.sort(key=lambda x: x.get("scores", {}).get("finalScore", 0), reverse=True)
    return products

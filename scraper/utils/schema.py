from datetime import datetime, timezone

from utils.parser import normalize_product_name


def _normalize_source_id(data, source_name):
    source_id = (
        data.get("source_id")
        or data.get("sourceId")
        or data.get("id")
        or data.get("product_id")
        or data.get("productId")
    )

    if source_id:
        source_id = str(source_id).strip()
        prefix = f"{source_name}_"
        if source_id.startswith(prefix):
            source_id = source_id[len(prefix):]
        return source_id

    fallback = data.get("url") or data.get("name") or data.get("title") or "unknown"
    return str(fallback).strip()


def normalize_product(data, source):
    """Normalize scraper output into the storage/API shape used across the service."""
    source_name = data.get("source") or source or "unknown"
    source_id = _normalize_source_id(data, source_name)

    current_price = data.get("current_price")
    if current_price is None:
        current_price = data.get("currentPrice")
    if current_price is None:
        current_price = data.get("price")

    original_price = data.get("original_price")
    if original_price is None:
        original_price = data.get("originalPrice")
    if original_price is None:
        original_price = data.get("mrp")

    discount_pct = data.get("discount_pct")
    if discount_pct is None:
        discount_pct = data.get("discountPct")
    if discount_pct is None:
        discount_pct = data.get("discount")

    review_count = data.get("review_count")
    if review_count is None:
        review_count = data.get("reviewCount")
    if review_count is None:
        review_count = data.get("reviews_count")

    name = normalize_product_name(data.get("name") or data.get("title") or "")
    scraped_at = data.get("scraped_at") or data.get("scrapedAt") or datetime.now(timezone.utc).isoformat()
    timestamp = datetime.now(timezone.utc)
    image = data.get("image")
    if image is None:
        images = data.get("images") or []
        image = images[0] if images else None

    normalized = {
        "product_id": f"{source_name}_{source_id}",
        "productId": data.get("productId"),
        "source": source_name,
        "source_id": str(source_id),
        "sourceId": str(source_id),
        "name": name,
        "title": name,
        "brand": data.get("brand"),
        "category": data.get("category") or "Electronics",
        "url": data.get("url"),
        "image": image,
        "images": data.get("images", []),
        "current_price": current_price,
        "currentPrice": current_price,
        "original_price": original_price,
        "originalPrice": original_price,
        "discount_pct": discount_pct,
        "discountPct": discount_pct,
        "rating": data.get("rating"),
        "review_count": review_count,
        "reviewCount": review_count,
        "currency": data.get("currency", "INR"),
        "availability": data.get("availability", "unknown"),
        "features": data.get("features", []),
        "scraped_at": scraped_at,
        "scrapedAt": scraped_at,
        "timestamp": timestamp,
        "updated_at": data.get("updated_at") or data.get("updatedAt") or timestamp,
        "updatedAt": data.get("updatedAt") or data.get("updated_at") or timestamp,
    }

    for field in [
        "affiliateUrl",
        "buyDecision",
        "buy_decision",
        "description",
        "hypeLabel",
        "insights",
        "pricePrediction",
        "scoreUpdatedAt",
        "scores",
        "sentimentLabel",
    ]:
        if field in data:
            normalized[field] = data[field]

    return normalized

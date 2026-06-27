import html
import re
from datetime import datetime, timezone
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit

from utils.parser import normalize_product_name

SOURCE_BASE_URLS = {
    "amazon": "https://www.amazon.in",
    "flipkart": "https://www.flipkart.com",
    "myntra": "https://www.myntra.com",
    "apollo_pharmacy": "https://www.apollopharmacy.in",
}


def _extract_source_id_from_url(url: str, source_name: str):
    if not url:
        return None

    parsed = urlsplit(url)
    path = parsed.path or ""

    if source_name == "amazon":
        match = re.search(r"/(?:dp|gp/product)/([A-Z0-9]{10})", path, re.IGNORECASE)
        return match.group(1).upper() if match else None

    if source_name == "flipkart":
        for key, value in parse_qsl(parsed.query, keep_blank_values=True):
            if key.lower() == "pid" and value:
                return value
        match = re.search(r"/p/([^/?#]+)", path)
        return match.group(1) if match else None

    if source_name == "myntra":
        numbers = re.findall(r"/(\d{4,})(?:/|$)", path)
        return numbers[-1] if numbers else None

    if source_name == "apollo_pharmacy":
        parts = [part for part in path.strip("/").split("/") if part]
        return parts[-1] if parts else None

    return None


def _clean_marketplace_url(raw_url, source_name: str, source_id=None):
    base_url = SOURCE_BASE_URLS.get(source_name)
    url = str(raw_url or "").strip()

    if not url and source_name == "amazon" and source_id:
        return f"{base_url}/dp/{source_id}"
    if not url:
        return None

    url = html.unescape(url)
    second_http = re.search(r"https?://", url[8:], re.IGNORECASE)
    if second_http:
        url = url[8 + second_http.start():]

    if base_url:
        url = urljoin(base_url, url)

    parsed = urlsplit(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None

    host = parsed.netloc.lower()
    if source_name == "amazon" and "amazon." in host:
        asin = source_id or _extract_source_id_from_url(url, source_name)
        if asin and re.fullmatch(r"[A-Z0-9]{10}", str(asin), re.IGNORECASE):
            return f"{SOURCE_BASE_URLS[source_name]}/dp/{str(asin).upper()}"

    if source_name == "flipkart" and "flipkart.com" in host:
        query_pairs = [(key, value) for key, value in parse_qsl(parsed.query) if key.lower() in {"pid", "lid"}]
        return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(query_pairs), ""))

    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))


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

    cleaned_url = _clean_marketplace_url(data.get("url") or data.get("product_url") or data.get("link"), source_name)
    source_id = _extract_source_id_from_url(cleaned_url, source_name) if cleaned_url else None
    if source_id:
        return str(source_id).strip()

    fallback = cleaned_url or data.get("name") or data.get("title") or "unknown"
    return str(fallback).strip()


def normalize_product(data, source):
    """Normalize scraper output into the storage/API shape used across the service."""
    source_name = str(data.get("source") or source or "unknown").strip().lower()
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
        "url": _clean_marketplace_url(
            data.get("url") or data.get("product_url") or data.get("link"),
            source_name,
            source_id,
        ),
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

    affiliate_url = data.get("affiliateUrl") or data.get("affiliate_url")
    if affiliate_url:
        normalized["affiliateUrl"] = _clean_marketplace_url(affiliate_url, source_name, source_id)
        normalized["affiliate_url"] = normalized["affiliateUrl"]

    for field in [
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

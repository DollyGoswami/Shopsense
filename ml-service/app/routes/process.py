from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["Processing"])


def compute_score(product: dict) -> float:
    rating = float(product.get("rating") or 0)
    discount = float(product.get("discount_pct") or product.get("discount") or 0)
    price = float(product.get("current_price") or product.get("price") or 0)

    return round(
        0.4 * rating * 20
        + 0.3 * min(discount, 100)
        + 0.3 * (100 if 0 < price < 50000 else 40),
        1,
    )


def compute_trend(product: dict) -> float:
    price = float(product.get("current_price") or product.get("price") or 0)
    original = float(product.get("original_price") or price or 0)
    drop_pct = ((original - price) / original * 100) if original > 0 else 0
    rating = float(product.get("rating") or 0)

    return round(min(100, max(0, 0.5 * rating * 20 + 0.5 * drop_pct)), 1)


@router.post("/process-products")
async def process_products(data: dict):
    products = data.get("products")
    if not products:
        raise HTTPException(status_code=400, detail="products list required")

    processed = []
    for product in products:
        enriched = {**product}
        enriched["score"] = compute_score(enriched)
        enriched["trend_score"] = compute_trend(enriched)
        processed.append(enriched)

    return {"products": processed}

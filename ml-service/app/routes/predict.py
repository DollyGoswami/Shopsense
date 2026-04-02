import os
from typing import Optional

from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from app.models.price_predictor import compute_price_score, predict_prices

router = APIRouter(prefix="/predict", tags=["Price Prediction"])

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/shopsense")
client = AsyncIOMotorClient(MONGO_URI)
db = client["shopsense"]


class PredictRequest(BaseModel):
    price_history: list[dict]
    days_ahead: Optional[int] = 7


class ScoreRequest(BaseModel):
    current_price: float
    original_price: Optional[float] = None
    price_history: Optional[list[dict]] = None


@router.post("/price")
async def predict_price(req: PredictRequest):
    if not req.price_history:
        raise HTTPException(status_code=400, detail="price_history required")
    return predict_prices(req.price_history, req.days_ahead or 7)


@router.post("/price-score")
async def price_score(req: ScoreRequest):
    score = compute_price_score(req.current_price, req.original_price, req.price_history or [])
    return {"price_score": score}


@router.get("/flash-sale")
async def flash_sale_prediction():
    cursor = db["products"].find({"discount_pct": {"$gte": 10}}).sort("discount_pct", -1).limit(10)
    products = await cursor.to_list(length=10)

    predictions = []
    for p in products:
        p["_id"] = str(p["_id"])
        discount = p.get("discount_pct") or 0
        sale_prob = min(95, 50 + discount)
        days_until = max(1, int((100 - sale_prob) / 10))
        predictions.append(
            {
                **p,
                "saleProbability": sale_prob,
                "predictedDays": days_until,
            }
        )

    return {"predictions": predictions, "count": len(predictions)}


@router.get("/{product_id}")
async def predict_for_product(product_id: str, days_ahead: int = 7):
    product = await db["products"].find_one({"_id": product_id})
    if not product:
        from bson import ObjectId

        try:
            product = await db["products"].find_one({"_id": ObjectId(product_id)})
        except Exception:
            product = None

    if not product:
        raise HTTPException(status_code=404, detail="product not found")

    pid = product.get("product_id")
    if not pid:
        raise HTTPException(status_code=400, detail="product_id missing on product")

    history_cursor = db["price_history"].find({"product_id": pid}).sort("timestamp", 1)
    history_docs = await history_cursor.to_list(length=365)
    price_history = [{"price": h.get("price"), "timestamp": str(h.get("timestamp"))} for h in history_docs if h.get("price") is not None]

    if not price_history:
        raise HTTPException(status_code=404, detail="price history not found")

    prediction = predict_prices(price_history, days_ahead=days_ahead)
    return {
        "product_id": str(product.get("_id")),
        "source_product_id": pid,
        **prediction,
    }

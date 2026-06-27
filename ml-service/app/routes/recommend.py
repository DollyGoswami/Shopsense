"""
Recommendation API routes
"""
import os
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

from app.models.recommendation import apply_user_personalization, score_and_rank, score_product
from app.services.trend_analyzer import compute_trend_scores_batch, get_trend_signals

router = APIRouter(tags=["Recommendations"])

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/shopsense")
client = AsyncIOMotorClient(MONGO_URI)
db = client["shopsense"]


class RecommendRequest(BaseModel):
    products: Optional[list[dict]] = None
    user: Optional[dict] = None
    userId: Optional[str] = None
    user_preferences: Optional[dict] = None
    category: Optional[str] = None
    limit: int = 10


class ScoreRequest(BaseModel):
    products: list[dict]


class SingleScoreRequest(BaseModel):
    product: dict


class TrendRequest(BaseModel):
    keywords: list[str]
    keyword_products: Optional[dict[str, list[dict]]] = None
    limit: int = 6


async def _load_price_histories(products: list[dict]) -> dict:
    product_ids = [product.get("product_id") for product in products if product.get("product_id")]
    if not product_ids:
        return {}

    history_cursor = db["price_history"].find({"product_id": {"$in": product_ids}})
    history_docs = await history_cursor.to_list(length=5000)

    price_histories = {}
    for history_doc in history_docs:
        product_id = history_doc["product_id"]
        price_histories.setdefault(product_id, []).append(
            {
                "price": history_doc["price"],
                "timestamp": str(history_doc["timestamp"]),
            }
        )
    return price_histories


async def _resolve_preferences(req: RecommendRequest) -> Optional[dict]:
    preferences = req.user_preferences or req.user
    if preferences:
        return preferences

    if req.userId:
        try:
            user_doc = await db["users"].find_one({"_id": ObjectId(req.userId)})
            if user_doc and user_doc.get("preferences"):
                return user_doc["preferences"]
        except Exception:
            return None

    return None


@router.post("/recommend")
async def get_recommendations(req: RecommendRequest):
    if req.products:
        products = req.products
    else:
        filter_query = {}
        if req.category:
            filter_query["category"] = {"$regex": req.category, "$options": "i"}

        cursor = db["products"].find(filter_query).limit(req.limit * 3)
        products = await cursor.to_list(length=req.limit * 3)

    if not products:
        return {"products": [], "recommendations": [], "count": 0, "total_scored": 0}

    for product in products:
        if product.get("_id") is not None:
            product["_id"] = str(product["_id"])

    price_histories = await _load_price_histories(products)
    trend_scores = await compute_trend_scores_batch(products)

    for product in products:
        product_id = product.get("product_id") or product.get("source_id") or str(product.get("_id", ""))
        product["trend_score"] = trend_scores.get(product_id, 50.0)

    ranked = score_and_rank(products, price_histories)
    preferences = await _resolve_preferences(req)
    if preferences:
        ranked = apply_user_personalization(ranked, preferences)

    top = ranked[: req.limit]
    return {
        "products": top,
        "recommendations": top,
        "count": len(top),
        "total_scored": len(ranked),
    }


@router.post("/recommend/score")
async def score_products(req: ScoreRequest):
    if not req.products:
        raise HTTPException(status_code=400, detail="products list required")

    trend_scores = await compute_trend_scores_batch(req.products)
    products = []
    for product in req.products:
        product_id = product.get("product_id") or product.get("source_id") or str(product.get("_id", ""))
        enriched = {**product, "trend_score": trend_scores.get(product_id, 50.0)}
        products.append(enriched)

    scored = score_and_rank(products)
    return {"scored": scored, "count": len(scored)}


@router.post("/score")
async def score_single_product(req: SingleScoreRequest):
    trend_scores = await compute_trend_scores_batch([req.product])
    product = {**req.product}
    product_id = product.get("product_id") or product.get("source_id") or str(product.get("_id", ""))
    product["trend_score"] = trend_scores.get(product_id, 50.0)
    result = score_product(product)

    return {
        "scores": result.get("scores", {}),
        "buy_decision": result.get("buyDecision"),
        "hype_label": result.get("hypeLabel"),
        "price_prediction": result.get("pricePrediction", {}),
        "product": {**product, **result},
    }


@router.post("/recommend/trends")
async def get_live_trends(req: TrendRequest):
    signals = await get_trend_signals(
        req.keywords,
        keyword_products=req.keyword_products,
        limit=req.limit,
    )
    return {"signals": signals, "count": len(signals)}

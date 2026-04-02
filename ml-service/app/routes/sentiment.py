from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.models.sentiment_analyzer import analyze_text, analyze_reviews, extract_insights

router = APIRouter(prefix="/sentiment", tags=["Sentiment"])


class TextRequest(BaseModel):
    text: str


class ReviewsRequest(BaseModel):
    reviews: list[str]
    extract_insights: Optional[bool] = True


@router.post("/analyze")
async def analyze_single(req: TextRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text cannot be empty")
    return analyze_text(req.text)

@router.post("/reviews")
async def analyze_reviews_endpoint(req: ReviewsRequest):
    if not req.reviews:
        raise HTTPException(status_code=400, detail="reviews list required")

    sentiment = analyze_reviews(req.reviews)
    result    = {"sentiment": sentiment}

    if req.extract_insights:
        result["insights"] = extract_insights(req.reviews)

    return result

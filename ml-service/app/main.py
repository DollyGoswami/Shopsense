"""
ShopSense ML Service - FastAPI
Port: 8001
"""
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.predict import router as predict_router
from app.routes.process import router as process_router
from app.routes.recommend import router as recommend_router
from app.routes.sentiment import router as sentiment_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio

    async def warmup():
        from app.models.sentiment_analyzer import analyze_text

        analyze_text("This product is great!")
        print("[ML Service] Sentiment model warmed up")

    asyncio.create_task(warmup())
    print(f"[ML Service] Started on port {os.getenv('ML_PORT', 8001)}")
    yield
    print("[ML Service] Shutdown")


app = FastAPI(
    title="ShopSense ML Service",
    version="1.0.0",
    description="Recommendation, Sentiment Analysis, Price Prediction",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recommend_router)
app.include_router(sentiment_router)
app.include_router(predict_router)
app.include_router(process_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ml"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.getenv("ML_PORT", 8001)), reload=True)

"""
Sentiment Analysis Model
- Primary:  HuggingFace transformer (RoBERTa fine-tuned on product reviews)
- Fallback: VADER (rule-based, no GPU needed, instant)
Analyzes review text → returns score, label, pros, cons.
"""
import os
import re
from typing import Optional
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# Lazy-load transformer to avoid slow startup
_transformer_pipeline = None


def _get_transformer():
    global _transformer_pipeline
    if _transformer_pipeline is None:
        try:
            from transformers import pipeline
            model = os.getenv("SENTIMENT_MODEL", "cardiffnlp/twitter-roberta-base-sentiment-latest")
            device = 0 if os.getenv("USE_GPU", "false").lower() == "true" else -1
            print(f"[Sentiment] Loading transformer model: {model}")
            _transformer_pipeline = pipeline(
                "sentiment-analysis",
                model=model,
                device=device,
                truncation=True,
                max_length=512,
            )
            print("[Sentiment] Transformer model loaded ✅")
        except Exception as e:
            print(f"[Sentiment] Transformer load failed ({e}), will use VADER only")
            _transformer_pipeline = "failed"
    return _transformer_pipeline if _transformer_pipeline != "failed" else None


# VADER instance (always available, no model download needed)
_vader = SentimentIntensityAnalyzer()


def analyze_text(text: str) -> dict:
    """
    Analyze sentiment of a single text string.
    Returns:
        {
          score: float (0–1, higher = more positive),
          label: "positive" | "negative" | "neutral",
          confidence: float,
          method: "transformer" | "vader"
        }
    """
    if not text or not text.strip():
        return {"score": 0.5, "label": "neutral", "confidence": 0.0, "method": "none"}

    # Try transformer first
    pipe = _get_transformer()
    if pipe:
        try:
            result  = pipe(text[:512])[0]
            label   = result["label"].lower()
            raw_score = result["score"]

            # Normalize: positive→high score, negative→low, neutral→0.5
            if "positive" in label or label == "pos":
                score = 0.5 + raw_score * 0.5
            elif "negative" in label or label == "neg":
                score = 0.5 - raw_score * 0.5
            else:
                score = 0.5

            return {
                "score":      round(score, 4),
                "label":      "positive" if score > 0.6 else "negative" if score < 0.4 else "neutral",
                "confidence": round(raw_score, 4),
                "method":     "transformer",
            }
        except Exception as e:
            print(f"[Sentiment] Transformer inference error: {e}")

    # VADER fallback
    scores = _vader.polarity_scores(text)
    compound = scores["compound"]   # -1 to +1

    # Normalize to 0–1
    normalized = (compound + 1) / 2

    return {
        "score":      round(normalized, 4),
        "label":      "positive" if compound > 0.05 else "negative" if compound < -0.05 else "neutral",
        "confidence": round(abs(compound), 4),
        "method":     "vader",
    }

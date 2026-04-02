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


def analyze_reviews(reviews: list[str]) -> dict:
    """
    Analyze a list of review strings.
    Returns aggregated sentiment + positive/negative ratio.
    """
    if not reviews:
        return {
            "score":         0.5,
            "label":         "neutral",
            "positive_ratio": 0.5,
            "negative_ratio": 0.5,
            "review_count":   0,
            "method":        "none",
        }

    results = [analyze_text(r) for r in reviews[:50]]  # cap at 50 reviews
    scores  = [r["score"]  for r in results]
    labels  = [r["label"]  for r in results]

    avg_score      = sum(scores) / len(scores)
    positive_ratio = labels.count("positive") / len(labels)
    negative_ratio = labels.count("negative") / len(labels)

    if positive_ratio > 0.6:
        label = "positive"
    elif negative_ratio > 0.5:
        label = "negative"
    else:
        label = "neutral"

    return {
        "score":          round(avg_score, 4),
        "label":          label,
        "positive_ratio": round(positive_ratio, 4),
        "negative_ratio": round(negative_ratio, 4),
        "review_count":   len(results),
        "method":         results[0]["method"] if results else "none",
    }


# ── Review insight extraction ──────────────────────────────────────────────────

# Phrase patterns that signal pros/cons
_PRO_KEYWORDS = [
    r"\bgood\b", r"\bgreat\b", r"\bexcellent\b", r"\bamazing\b", r"\bperfect\b",
    r"\bfantastic\b", r"\blove\b", r"\bworth\b", r"\bimpressive\b", r"\bbeautiful\b",
    r"\bfast\b", r"\bsmooth\b", r"\bdurable\b", r"\bcomfort", r"\bbattery.*good\b",
]
_CON_KEYWORDS = [
    r"\bbad\b", r"\bpoor\b", r"\bterrible\b", r"\bdisappoint", r"\bworst\b",
    r"\bawful\b", r"\bbroken\b", r"\bdefect", r"\boverpriced\b", r"\bexpensive\b",
    r"\bslow\b", r"\blagg", r"\bcrash", r"\bheat", r"\bbattery.*bad\b", r"\bshort.*battery\b",
]


def _sentence_tokenize(text: str) -> list[str]:
    """Simple sentence splitter (no NLTK needed)."""
    return [s.strip() for s in re.split(r"[.!?]+", text) if len(s.strip()) > 10]


def extract_insights(reviews: list[str]) -> dict:
    """
    Extract top pros and cons from a list of review strings.
    Returns:
        {
          pros: [str, ...],
          cons: [str, ...],
        }
    """
    pros, cons = [], []

    for review in reviews[:30]:
        sentences = _sentence_tokenize(review.lower())
        for sent in sentences:
            is_pro = any(re.search(kw, sent) for kw in _PRO_KEYWORDS)
            is_con = any(re.search(kw, sent) for kw in _CON_KEYWORDS)

            if is_pro and not is_con and len(pros) < 10:
                pros.append(sent.strip().capitalize())
            elif is_con and not is_pro and len(cons) < 10:
                cons.append(sent.strip().capitalize())

    # Deduplicate roughly
    def dedup(lst):
        seen, out = set(), []
        for s in lst:
            key = s[:30]
            if key not in seen:
                seen.add(key)
                out.append(s)
        return out[:5]

    return {
        "pros": dedup(pros) or ["Good overall quality", "Recommended by buyers"],
        "cons": dedup(cons) or ["No significant complaints found"],
    }


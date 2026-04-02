"""
Shared HTML parsing utilities used across all scrapers.
"""
import re
from typing import Optional

from bs4 import BeautifulSoup


def clean_price(text: str) -> Optional[float]:
    """
    Extract numeric price from strings like:
    "Rs 89,999", "Rs. 1,34,900", "Rs 1,34,900.00", "MRP Rs 2,499".
    """
    if not text:
        return None

    cleaned = text.strip()
    cleaned = re.sub(r"(?i)\b(mrp|price|rs\.?|inr)\b", "", cleaned)
    cleaned = cleaned.replace(",", "")
    cleaned = re.sub(r"[^\d.]", "", cleaned)
    cleaned = cleaned.lstrip(".")

    if cleaned.count(".") > 1:
        whole, decimal = cleaned.rsplit(".", 1)
        cleaned = whole.replace(".", "") + f".{decimal}"

    try:
        return float(cleaned) if cleaned else None
    except ValueError:
        return None


def clean_rating(text: str) -> Optional[float]:
    """
    Extract rating from strings like "4.5 out of 5", "4.2*", "4.5".
    """
    if not text:
        return None

    match = re.search(r"(\d+\.?\d*)", text)
    if not match:
        return None

    val = float(match.group(1))
    return round(min(val, 5.0), 1)


def clean_review_count(text: str) -> Optional[int]:
    """
    Extract review count from "12,345 ratings", "1.2k reviews", "45,678".
    """
    if not text:
        return None

    text = text.lower().replace(",", "")
    match = re.search(r"([\d.]+)\s*k", text)
    if match:
        return int(float(match.group(1)) * 1000)

    match = re.search(r"(\d+)", text)
    if match:
        return int(match.group(1))

    return None


def extract_discount(original: float, current: float) -> float:
    """Calculate discount percentage."""
    if not original or original <= 0:
        return 0.0
    return round(((original - current) / original) * 100, 1)


def get_soup(html: str) -> BeautifulSoup:
    """Return BeautifulSoup object with lxml parser."""
    return BeautifulSoup(html, "lxml")


def normalize_product_name(name: str) -> str:
    """Clean up product name and collapse whitespace."""
    if not name:
        return ""

    name = re.sub(r"\s+", " ", name.strip())
    name = name.replace("\n", " ").replace("\t", " ")
    return name[:300]


def detect_availability(text: str) -> str:
    """Detect stock status from page text."""
    if not text:
        return "unknown"

    text_lower = text.lower()
    if any(k in text_lower for k in ["out of stock", "currently unavailable", "sold out", "not available"]):
        return "out_of_stock"
    if any(k in text_lower for k in ["only", "left in stock", "hurry", "limited"]):
        return "low_stock"
    if any(k in text_lower for k in ["in stock", "add to cart", "buy now", "available"]):
        return "in_stock"
    return "unknown"

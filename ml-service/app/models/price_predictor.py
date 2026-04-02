"""
Price Prediction Model
- Uses ARIMA for time-series forecasting when enough history exists (>14 points)
- Falls back to Linear Regression for shorter histories
- Outputs: predicted prices for next N days, trend direction, buy decision
"""
import numpy as np
from datetime import datetime, timedelta, timezone
from typing import Optional


def _linear_regression_predict(prices: list[float], days_ahead: int = 7) -> list[float]:
    """Simple OLS linear regression for short price histories."""
    n = len(prices)
    x = np.arange(n, dtype=float)
    y = np.array(prices, dtype=float)

    # Least squares: y = a + b*x
    x_mean, y_mean = x.mean(), y.mean()
    b = np.sum((x - x_mean) * (y - y_mean)) / (np.sum((x - x_mean) ** 2) + 1e-9)
    a = y_mean - b * x_mean

    # Predict next N days
    future_x   = np.arange(n, n + days_ahead, dtype=float)
    predictions = a + b * future_x

    # Clamp: price can't go negative or more than 2× current
    predictions = np.clip(predictions, y[-1] * 0.5, y[-1] * 2.0)
    return predictions.tolist()


def _arima_predict(prices: list[float], days_ahead: int = 7) -> list[float]:
    """ARIMA(1,1,1) for longer price histories."""
    try:
        from statsmodels.tsa.arima.model import ARIMA
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            model  = ARIMA(prices, order=(1, 1, 1))
            fitted = model.fit()
            forecast = fitted.forecast(steps=days_ahead)
        # Clamp
        last = prices[-1]
        forecast = [max(last * 0.4, min(last * 2.0, p)) for p in forecast]
        return [round(p, 2) for p in forecast]
    except Exception as e:
        print(f"[PricePredict] ARIMA failed ({e}), falling back to linear regression")
        return _linear_regression_predict(prices, days_ahead)



def predict_prices(
    price_history: list[dict],
    days_ahead: int = 7,
) -> dict:
    """
    Predict future prices from price history records.

    Args:
        price_history: list of {price: float, timestamp: str} dicts
                       (sorted oldest→newest)
        days_ahead:    how many days to forecast

    Returns:
        {
          predictions: [{date: str, price: float}, ...],
          trend:        "up" | "down" | "stable",
          lowest_predicted: float,
          lowest_date:      str,
          buy_decision:     "BUY" | "WAIT",
          confidence:       float  (0–1)
        }
    """
    # Extract price series
    prices = [float(p["price"]) for p in price_history if p.get("price")]
    if not prices:
        return {
            "predictions":       [],
            "trend":             "stable",
            "lowest_predicted":  None,
            "lowest_date":       None,
            "buy_decision":      "BUY",
            "confidence":        0.0,
        }

    current_price = prices[-1]

    # Choose model based on data length
    if len(prices) >= 14:
        future_prices = _arima_predict(prices, days_ahead)
        method        = "arima"
    else:
        future_prices = _linear_regression_predict(prices, days_ahead)
        method        = "linear_regression"

    # Build prediction timeline
    today = datetime.now(timezone.utc)
    predictions = []
    for i, price in enumerate(future_prices):
        date = (today + timedelta(days=i + 1)).strftime("%Y-%m-%d")
        predictions.append({"date": date, "price": round(price, 2)})

    # Determine trend
    avg_predicted = np.mean(future_prices)
    pct_change    = (avg_predicted - current_price) / current_price

    if pct_change < -0.03:
        trend = "down"
    elif pct_change > 0.03:
        trend = "up"
    else:
        trend = "stable"

    # Lowest predicted price
    lowest_price = min(future_prices)
    lowest_idx   = future_prices.index(lowest_price)
    lowest_date  = (today + timedelta(days=lowest_idx + 1)).strftime("%Y-%m-%d")

    # Buy decision
    # If price predicted to drop >3% in next 7 days → WAIT
    # If price is at/near its predicted lowest → BUY
    if trend == "down" and pct_change < -0.03:
        buy_decision = "WAIT"
    elif trend == "up":
        buy_decision = "BUY"   # Buy before it rises further
    else:
        buy_decision = "BUY"

    # Confidence: higher for longer histories
    confidence = min(0.9, 0.3 + len(prices) * 0.02)

    return {
        "predictions":       predictions,
        "trend":             trend,
        "trend_pct":         round(pct_change * 100, 2),
        "lowest_predicted":  round(lowest_price, 2),
        "lowest_date":       lowest_date,
        "buy_decision":      buy_decision,
        "method":            method,
        "confidence":        round(confidence, 2),
        "current_price":     current_price,
    }


def compute_price_score(
    current_price: float,
    original_price: Optional[float],
    price_history: list[dict],
) -> float:
    """
    Compute 0–100 price score for the hybrid recommendation model.
    Higher = better deal.
    """
    score = 50.0

    # Discount factor (0–40 pts)
    if original_price and original_price > 0:
        discount = (original_price - current_price) / original_price
        score += min(40.0, discount * 100)

    # Historical position factor (0–30 pts)
    # Is current price near the historical low?
    if len(price_history) >= 3:
        hist_prices = [p["price"] for p in price_history if p.get("price")]
        if hist_prices:
            min_hist = min(hist_prices)
            max_hist = max(hist_prices)
            price_range = max_hist - min_hist
            if price_range > 0:
                position = (max_hist - current_price) / price_range  # 1 = at min, 0 = at max
                score += position * 30.0

    # Trend bonus (0–10 pts)
    if len(price_history) >= 5:
        prediction = predict_prices(price_history, days_ahead=7)
        if prediction["trend"] == "down":
            score -= 10  # Penalize: cheaper to wait
        elif prediction["trend"] == "up":
            score += 10  # Reward: buy now before it rises

    return round(min(100.0, max(0.0, score)), 1)



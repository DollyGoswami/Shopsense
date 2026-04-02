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


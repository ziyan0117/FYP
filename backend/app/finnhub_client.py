"""
Thin wrapper around the Finnhub API (https://finnhub.io/docs/api).
Requires FINNHUB_API_KEY to be set -- copy .env.example to .env and fill it
in with the free API key from https://finnhub.io.
"""
from datetime import date, timedelta
import requests

from .config import FINNHUB_API_KEY

BASE_URL = "https://finnhub.io/api/v1"


def fetch_company_news(symbol: str, lookback_days: int = 3) -> list[dict]:
    """
    Fetch recent news for one ticker via Finnhub's /company-news endpoint.
    Each item is a dict including: headline, summary, source, url,
    datetime (unix seconds), related (comma-separated related tickers).
    """
    if not FINNHUB_API_KEY:
        raise RuntimeError("FINNHUB_API_KEY is not set -- add it to your .env file")

    to_date = date.today()
    from_date = to_date - timedelta(days=lookback_days)

    resp = requests.get(
        f"{BASE_URL}/company-news",
        params={
            "symbol": symbol,
            "from": from_date.isoformat(),
            "to": to_date.isoformat(),
            "token": FINNHUB_API_KEY,
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def fetch_general_news(category: str = "general") -> list[dict]:
    """Fetch general market news, not tied to a single ticker."""
    if not FINNHUB_API_KEY:
        raise RuntimeError("FINNHUB_API_KEY is not set -- add it to your .env file")

    resp = requests.get(
        f"{BASE_URL}/news",
        params={"category": category, "token": FINNHUB_API_KEY},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()

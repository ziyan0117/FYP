import time
from datetime import date, timedelta

import requests

from .config import FINNHUB_API_KEY

BASE_URL = "https://finnhub.io/api/v1"


CHUNK_DAYS = 30
_REQUEST_DELAY_SECONDS = 1.1


def _fetch_company_news_chunk(symbol: str, from_date: date, to_date: date) -> list[dict]:
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


def fetch_company_news(symbol: str, lookback_days: int = 3) -> list[dict]:
    """
    Fetch recent news for one ticker via Finnhub's /company-news endpoint.
    Each item is a dict including: headline, summary, source, url,
    datetime (unix seconds), related (comma-separated related tickers).

    For `lookback_days` longer than CHUNK_DAYS, this makes multiple calls --
    one per CHUNK_DAYS-wide window -- since Finnhub appears to silently
    truncate a single call's results to roughly the last 30 days regardless
    of the requested date range. Content-hash deduplication in ingest.py
    makes it safe to call this repeatedly with overlapping ranges.
    """
    if not FINNHUB_API_KEY:
        raise RuntimeError("FINNHUB_API_KEY is not set -- add it to your .env file")

    to_date = date.today()
    range_start = to_date - timedelta(days=lookback_days)

    all_articles: list[dict] = []
    chunk_to = to_date
    first_chunk = True
    while chunk_to >= range_start:
        chunk_from = max(range_start, chunk_to - timedelta(days=CHUNK_DAYS))

        if not first_chunk:
            time.sleep(_REQUEST_DELAY_SECONDS)
        first_chunk = False

        all_articles.extend(_fetch_company_news_chunk(symbol, chunk_from, chunk_to))

        if chunk_from == range_start:
            break
        # Next window ends the day before this one started, so windows don't overlap.
        chunk_to = chunk_from - timedelta(days=1)

    return all_articles


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

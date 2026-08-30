import re
from datetime import datetime, timedelta, timezone

import requests

from .config import SERPAPI_API_KEY

BASE_URL = "https://serpapi.com/search"

_RELATIVE_AGO_RE = re.compile(r"(\d+)\s+(minute|hour|day|week|month)s?\s+ago", re.IGNORECASE)

_RELATIVE_UNIT_DELTAS = {
    "minute": lambda n: timedelta(minutes=n),
    "hour": lambda n: timedelta(hours=n),
    "day": lambda n: timedelta(days=n),
    "week": lambda n: timedelta(weeks=n),
    "month": lambda n: timedelta(days=n * 30),  # approximate -- good enough for a day-range filter
}


def _parse_published_at(item: dict) -> datetime | None:
    """
    SerpApi's News-tab results carry an absolute `published_at` field
    ("YYYY-MM-DD HH:MM:SS UTC") when it can extract one, and always carry a
    human-readable relative `date` field ("3 hours ago", "2 days ago") that
    is used as a fallback when the absolute field is missing. Returns None
    (rather than guessing) if neither can be parsed, so the caller can skip
    the article instead of storing it with a fabricated timestamp.
    """
    absolute = item.get("published_at")
    if absolute:
        try:
            cleaned = absolute.replace(" UTC", "").strip()
            return datetime.strptime(cleaned, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            pass

    match = _RELATIVE_AGO_RE.search(item.get("date") or "")
    if match:
        amount = int(match.group(1))
        unit = match.group(2).lower()
        return datetime.now(timezone.utc) - _RELATIVE_UNIT_DELTAS[unit](amount)

    return None


def fetch_company_news_serpapi(company_name: str, lookback_days: int = 3, num_results: int = 20) -> list[dict]:
    """
    Fetch recent Google News results for a company name via SerpApi and
    normalize them into the same raw-item shape Finnhub's fetch_company_news()
    produces (headline, summary, source, url, datetime as unix seconds,
    related), so ingest.py can store items from either source with no
    special-casing. Articles whose date cannot be determined, or that fall
    outside `lookback_days`, are dropped here rather than passed on.
    """
    if not SERPAPI_API_KEY:
        raise RuntimeError("SERPAPI_API_KEY is not set -- add it to your .env file")

    resp = requests.get(
        BASE_URL,
        params={
            "engine": "google",
            "tbm": "nws",
            "q": f"{company_name} stock",
            "api_key": SERPAPI_API_KEY,
            "num": num_results,
        },
        timeout=15,
    )
    resp.raise_for_status()
    payload = resp.json()

    if payload.get("search_metadata", {}).get("status") == "Error":
        raise RuntimeError(f"SerpApi error: {payload.get('error', 'unknown error')}")

    cutoff = datetime.now(timezone.utc) - timedelta(days=lookback_days)

    articles: list[dict] = []
    for item in payload.get("news_results", []):
        published_at = _parse_published_at(item)
        if published_at is None or published_at < cutoff:
            continue

        source = item.get("source", "")
        if not isinstance(source, str) or not source:
            source = "unknown"

        articles.append({
            "headline": item.get("title", ""),
            "summary": item.get("snippet", ""),
            "source": source,
            "url": item.get("link", ""),
            "datetime": int(published_at.timestamp()),
            "related": "",  # SerpApi does not tag related tickers
        })

    return articles

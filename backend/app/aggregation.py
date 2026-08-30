"""
Aggregates individual article sentiment into a company-level score
(report Chapter 4/5; evaluated in Chapter 6.3 for sensitivity/stability).

The score is a confidence-weighted, recency-decayed average over whatever
window of results is passed in, mapped onto a -1 (very negative) .. +1
(very positive) scale:
    positive -> +1, neutral -> 0, negative -> -1
weighted by (a) the model's confidence in that label and (b) an exponential
recency decay, so a two-week-old article counts for much less than
yesterday's. This module is pure Python (no DB/model dependency) so it can
be unit-tested directly -- see tests/test_aggregation.py.
"""
import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone

LABEL_VALUE = {"positive": 1.0, "neutral": 0.0, "negative": -1.0}

# Half-life of 3 days: an article's weight halves every 3 days of age.
# Chosen so a strong single-day sentiment swing is visible quickly but
# doesn't dominate the score for weeks -- revisit based on the Chapter 6.3
# sensitivity check once real data is available.
RECENCY_HALF_LIFE_DAYS = 3.0


def _recency_weight(published_at: datetime, as_of: datetime) -> float:
    # SQLite drops tzinfo on round-trip even though ingest.py stores UTC-aware
    # datetimes, so published_at can come back naive while as_of (freshly
    # constructed) is aware. Treat any naive datetime here as already being
    # UTC so the subtraction below is always aware-aware, regardless of which
    # DB backend is in use.
    if published_at.tzinfo is None:
        published_at = published_at.replace(tzinfo=timezone.utc)
    if as_of.tzinfo is None:
        as_of = as_of.replace(tzinfo=timezone.utc)
    age_days = max((as_of - published_at).total_seconds() / 86400.0, 0.0)
    return math.pow(0.5, age_days / RECENCY_HALF_LIFE_DAYS)


def aggregate_company_sentiment(results: list[dict], as_of: datetime | None = None) -> dict:
    """
    `results` is a list of dicts, one per article for this company:
        {"label": "positive"|"neutral"|"negative", "confidence": float, "published_at": datetime}

    Returns {"score": float in [-1, 1], "article_count": int}, or
    {"score": None, "article_count": 0} if `results` is empty.
    """
    as_of = as_of or datetime.now(timezone.utc)

    if not results:
        return {"score": None, "article_count": 0}

    weighted_sum = 0.0
    weight_total = 0.0
    for r in results:
        value = LABEL_VALUE[r["label"]]
        weight = r["confidence"] * _recency_weight(r["published_at"], as_of)
        weighted_sum += value * weight
        weight_total += weight

    score = weighted_sum / weight_total if weight_total > 0 else 0.0
    return {"score": round(score, 4), "article_count": len(results)}


def compute_daily_sentiment_series(results: list[dict], days: int = 14) -> list[dict]:
    """
    Buckets `results` (same shape as aggregate_company_sentiment: label,
    confidence, published_at) into one bucket per calendar day (UTC), covering
    the last `days` days including today, and aggregates each day using the
    same confidence+recency-weighted formula as aggregate_company_sentiment
    (with `as_of` pinned to the end of that day -- recency has negligible
    effect within a single day, so this is close to a same-day
    confidence-weighted mean).

    Returns oldest-day-first:
        [{"date": "YYYY-MM-DD", "score": float | None, "article_count": int}, ...]
    A day with zero articles gets score=None (not 0.0) so the frontend can
    render a gap in the line rather than a misleading flat "neutral" point --
    "no news that day" and "neutral news that day" are different facts.

    This is what report FR-12 (sentiment-over-time) is built on, and what
    Chapter 6.3's sensitivity check (does one strongly-worded article swing
    the line?) will run against with real data.
    """
    today = datetime.now(timezone.utc).date()
    start_day = today - timedelta(days=days - 1)

    buckets: dict = defaultdict(list)
    for r in results:
        published_at = r["published_at"]
        if published_at.tzinfo is None:
            published_at = published_at.replace(tzinfo=timezone.utc)
        day = published_at.date()
        if start_day <= day <= today:
            buckets[day].append(r)

    series = []
    day = start_day
    while day <= today:
        day_results = buckets.get(day, [])
        if day_results:
            end_of_day = datetime.combine(day, datetime.max.time(), tzinfo=timezone.utc)
            agg = aggregate_company_sentiment(day_results, as_of=end_of_day)
        else:
            agg = {"score": None, "article_count": 0}
        series.append({"date": day.isoformat(), **agg})
        day += timedelta(days=1)
    return series

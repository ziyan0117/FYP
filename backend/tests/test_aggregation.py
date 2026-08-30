"""
Unit tests for the article -> company sentiment aggregation logic. Pure
Python, no external dependencies -- run with:
    pytest tests/test_aggregation.py -v

These same behaviours (recency sensitivity in particular) are what Chapter
6.3's aggregation evaluation reports on with real data -- this file is the
unit-level check that the formula itself behaves as designed.
"""
from datetime import datetime, timedelta, timezone
from app.aggregation import aggregate_company_sentiment


def test_empty_results():
    assert aggregate_company_sentiment([]) == {"score": None, "article_count": 0}


def test_all_positive_gives_a_score_near_one():
    now = datetime.now(timezone.utc)
    results = [
        {"label": "positive", "confidence": 0.9, "published_at": now},
        {"label": "positive", "confidence": 0.8, "published_at": now},
    ]
    agg = aggregate_company_sentiment(results, as_of=now)
    assert agg["score"] > 0.9
    assert agg["article_count"] == 2


def test_recent_article_outweighs_a_much_older_opposite_one():
    now = datetime.now(timezone.utc)
    old = now - timedelta(days=30)
    results = [
        {"label": "negative", "confidence": 0.9, "published_at": old},
        {"label": "positive", "confidence": 0.9, "published_at": now},
    ]
    agg = aggregate_company_sentiment(results, as_of=now)
    assert agg["score"] > 0  # the recent positive should dominate the decayed old negative


def test_mixed_same_day_sentiment_is_between_extremes():
    now = datetime.now(timezone.utc)
    results = [
        {"label": "positive", "confidence": 0.9, "published_at": now},
        {"label": "negative", "confidence": 0.9, "published_at": now},
    ]
    agg = aggregate_company_sentiment(results, as_of=now)
    assert -0.1 < agg["score"] < 0.1  # roughly cancels out


def test_naive_published_at_does_not_raise():
    # Regression test: SQLite round-trips datetimes as naive even though
    # ingest.py inserts them as UTC-aware, which used to raise
    # "TypeError: can't subtract offset-naive and offset-aware datetimes"
    # when aggregate_company_sentiment() compared it against an aware as_of.
    naive_now = datetime.utcnow()  # tzinfo=None, like a value read back from SQLite
    results = [
        {"label": "positive", "confidence": 0.9, "published_at": naive_now},
    ]
    agg = aggregate_company_sentiment(results, as_of=datetime.now(timezone.utc))
    assert agg["score"] > 0.8
    assert agg["article_count"] == 1

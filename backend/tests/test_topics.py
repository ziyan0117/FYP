"""Unit tests for the lightweight keyword-clustering in app/topics.py."""
from datetime import datetime, timezone

from app.topics import cluster_topics

NOW = datetime.now(timezone.utc)


def _article(id, headline, tickers, label="positive", confidence=0.8, snippet=""):
    return {
        "id": id,
        "headline": headline,
        "snippet": snippet,
        "tickers": tickers,
        "label": label,
        "confidence": confidence,
        "published_at": NOW,
    }


def test_no_articles_gives_no_topics():
    assert cluster_topics([], set()) == []


def test_shared_phrase_across_tickers_forms_one_topic():
    articles = [
        _article(1, "Nvidia data centre revenue beats expectations", ["NVDA"]),
        _article(2, "AMD data centre chips see strong demand", ["AMD"]),
    ]
    company_terms = {"nvidia", "amd"}
    topics = cluster_topics(articles, company_terms, min_articles=2)
    assert len(topics) == 1
    assert topics[0]["article_count"] == 2
    assert set(topics[0]["tickers"]) == {"NVDA", "AMD"}
    assert "data" in topics[0]["label"].lower() and "centre" in topics[0]["label"].lower()


def test_below_min_articles_is_dropped_as_noise():
    articles = [_article(1, "A one-off headline about nothing shared", ["NVDA"])]
    topics = cluster_topics(articles, set(), min_articles=2)
    assert topics == []


def test_company_terms_are_excluded_from_candidate_phrases():
    # Both headlines only share the company's own name -- with company_terms
    # excluded there's no real shared phrase left, so no topic should form.
    articles = [
        _article(1, "Nvidia Nvidia announcement one", ["NVDA"]),
        _article(2, "Nvidia Nvidia announcement two", ["NVDA"]),
    ]
    topics = cluster_topics(articles, {"nvidia"}, min_articles=2)
    assert all("nvidia" not in t["label"].lower() for t in topics)


def test_word_order_does_not_split_the_same_topic_in_two():
    # "price cuts" and "cuts in price" should cluster together even though
    # the words appear in a different order.
    articles = [
        _article(1, "Tesla cuts prices in Europe again", ["TSLA"]),
        _article(2, "Tesla price cuts spark demand concerns", ["TSLA"]),
    ]
    topics = cluster_topics(articles, {"tesla"}, min_articles=2)
    assert len(topics) == 1
    assert topics[0]["article_count"] == 2


def test_articles_are_claimed_by_at_most_one_topic():
    # Article 2 is eligible for two overlapping candidate phrases; once the
    # stronger one claims it, it must not also appear in a second topic.
    articles = [
        _article(1, "Cloud giants raise capex spending plans", ["MSFT"]),
        _article(2, "Capex spending plans point one way for chips", ["NVDA"]),
        _article(3, "Capex spending plans lift the whole sector", ["AMD"]),
    ]
    topics = cluster_topics(articles, {"msft", "nvda", "amd"}, min_articles=2)
    seen_ids = [i for t in topics for i in range(t["article_count"])]
    total_claimed = sum(t["article_count"] for t in topics)
    assert total_claimed <= len(articles)


def test_topic_score_aggregates_member_sentiment():
    articles = [
        _article(1, "Chips demand outlook improves broadly", ["NVDA"], label="positive", confidence=0.9),
        _article(2, "Chips demand outlook worsens for some", ["AMD"], label="negative", confidence=0.9),
    ]
    topics = cluster_topics(articles, {"nvda", "amd"}, min_articles=2)
    assert len(topics) == 1
    # Roughly cancels out -- similar to aggregation.py's own mixed-sentiment test.
    assert -0.3 < topics[0]["score"] < 0.3

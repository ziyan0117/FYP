"""Integration tests for the new/changed API surface: prob fields + tickers
on articles, prev_score on company sentiment, /market/sentiment, /topics.
Each test gets its own throwaway SQLite file via the `client` fixture in
conftest.py."""
from datetime import datetime, timedelta, timezone


def _seed(client):
    from app.models import Company, Article, ArticleCompanyMap, SentimentResult

    db = client.db_session_local()
    nvda = Company(ticker="NVDA", name="NVIDIA", aliases="Nvidia")
    tsla = Company(ticker="TSLA", name="Tesla", aliases="")
    db.add_all([nvda, tsla])
    db.commit()

    now = datetime.now(timezone.utc)

    def add(company, headline, label, confidence, days_ago, probs):
        art = Article(
            source="Reuters",
            source_url=f"https://example.com/{company.ticker}-{days_ago}-{headline[:10]}",
            headline=headline,
            snippet="snippet",
            published_at=now - timedelta(days=days_ago),
            content_hash=f"hash-{company.ticker}-{days_ago}-{headline}",
        )
        db.add(art)
        db.flush()
        db.add(ArticleCompanyMap(article_id=art.id, company_id=company.id, match_method="api"))
        db.add(
            SentimentResult(
                article_id=art.id,
                model_name="finbert",
                label=label,
                confidence=confidence,
                prob_positive=probs[0],
                prob_neutral=probs[1],
                prob_negative=probs[2],
            )
        )
        db.commit()
        return art

    # Recent window (last 7 days): strongly positive for NVDA.
    a1 = add(nvda, "Nvidia data centre revenue beats again", "positive", 0.9, 1, (0.9, 0.08, 0.02))
    add(nvda, "Nvidia data centre demand stays strong", "positive", 0.8, 2, (0.8, 0.15, 0.05))
    # Previous window (8-14 days ago): negative for NVDA, so prev_score < score.
    add(nvda, "Nvidia guidance disappoints investors", "negative", 0.7, 10, (0.1, 0.2, 0.7))
    # TSLA, only in the recent window.
    add(tsla, "Tesla cuts prices in Europe again", "negative", 0.6, 1, (0.1, 0.3, 0.6))
    article_id = a1.id
    db.close()
    return article_id


def test_article_detail_includes_probs_and_tickers(client):
    article_id = _seed(client)
    r = client.get(f"/articles/{article_id}")
    assert r.status_code == 200
    body = r.json()
    assert body["prob_positive"] == 0.9
    assert body["prob_negative"] == 0.02
    assert body["tickers"] == ["NVDA"]


def test_company_news_includes_probs(client):
    _seed(client)
    r = client.get("/companies/NVDA/news", params={"days": 7})
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 2
    assert all(item["prob_positive"] is not None for item in body)
    assert all(item["tickers"] == ["NVDA"] for item in body)


def test_company_sentiment_prev_score_reflects_prior_window(client):
    _seed(client)
    r = client.get("/companies/NVDA/sentiment", params={"days": 7})
    assert r.status_code == 200
    body = r.json()
    assert body["score"] > 0  # recent window is positive
    assert body["prev_score"] is not None
    assert body["prev_score"] < 0  # previous window was the negative article
    assert body["prev_article_count"] == 1  # the one negative article, 10 days ago


def test_company_sentiment_prev_score_is_none_without_days(client):
    _seed(client)
    r = client.get("/companies/NVDA/sentiment")
    assert r.status_code == 200
    body = r.json()
    assert body["prev_score"] is None
    assert body["prev_article_count"] == 0


def test_market_sentiment_combines_the_whole_watchlist(client):
    _seed(client)
    r = client.get("/market/sentiment", params={"days": 7})
    assert r.status_code == 200
    body = r.json()
    assert body["company_count"] == 2
    assert body["article_count"] == 3  # 2 NVDA + 1 TSLA in the recent window
    assert body["prev_score"] is not None


def test_topics_endpoint_returns_clusters(client):
    _seed(client)
    r = client.get("/topics", params={"days": 14, "limit": 5})
    assert r.status_code == 200
    body = r.json()
    assert any("data" in t["label"].lower() for t in body)

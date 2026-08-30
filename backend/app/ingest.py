"""
Ingestion orchestration: for each watchlist company, fetch news, preprocess,
match to companies, classify sentiment, and store everything. Also pulls
general market news for broader coverage.

Run directly:
    python -m app.ingest
"""
from datetime import datetime, timezone

from .config import NEWS_LOOKBACK_DAYS
from .database import SessionLocal, init_db
from .models import Company, Article, ArticleCompanyMap, SentimentResult
from .preprocessing import clean_text, compute_content_hash
from .ticker_matching import Company as MatchCompany, match_article_to_companies
from .finnhub_client import fetch_company_news, fetch_general_news
from .sentiment import classify


def _to_match_companies(companies: list[Company]) -> list[MatchCompany]:
    return [
        MatchCompany(id=c.id, ticker=c.ticker, name=c.name, aliases=c.alias_list())
        for c in companies
    ]


def _store_article(db, raw_item: dict, companies: list[Company], api_symbols: list[str]):
    headline = clean_text(raw_item.get("headline", ""))
    snippet = clean_text(raw_item.get("summary", ""))
    source_url = raw_item.get("url", "")
    source = raw_item.get("source", "unknown")
    published_ts = raw_item.get("datetime")

    if not headline or not source_url or not published_ts:
        return None  # skip malformed entries rather than crash the whole run

    content_hash = compute_content_hash(source_url, headline)
    existing = db.query(Article).filter_by(content_hash=content_hash).first()
    if existing:
        return None  # already ingested on a previous run

    article = Article(
        source=source,
        source_url=source_url,
        headline=headline,
        snippet=snippet,
        published_at=datetime.fromtimestamp(published_ts, tz=timezone.utc),
        content_hash=content_hash,
    )
    db.add(article)
    db.flush()  # assigns article.id without committing yet

    matches = match_article_to_companies(
        headline, snippet, api_symbols, _to_match_companies(companies)
    )
    for match_company, method in matches:
        db.add(ArticleCompanyMap(
            article_id=article.id, company_id=match_company.id, match_method=method
        ))

    if matches:  # only run the model on articles that concern a watchlist company
        result = classify(f"{headline}. {snippet}".strip())
        db.add(SentimentResult(
            article_id=article.id,
            model_name="finbert",
            label=result["label"],
            confidence=result["confidence"],
            prob_positive=result["prob_positive"],
            prob_neutral=result["prob_neutral"],
            prob_negative=result["prob_negative"],
        ))

    return article


def run_ingestion():
    init_db()
    db = SessionLocal()
    stored_count = 0
    try:
        companies = db.query(Company).all()
        if not companies:
            print("No companies in the watchlist yet -- run seed_companies.py first.")
            return

        for company in companies:
            print(f"Fetching news for {company.ticker}...")
            try:
                raw_items = fetch_company_news(company.ticker, NEWS_LOOKBACK_DAYS)
            except Exception as exc:
                print(f"  Skipped {company.ticker}: {exc}")
                continue

            for raw_item in raw_items:
                api_symbols = [s.strip() for s in raw_item.get("related", "").split(",") if s.strip()]
                article = _store_article(db, raw_item, companies, api_symbols)
                if article:
                    stored_count += 1
            db.commit()

        print("Fetching general market news...")
        try:
            general_items = fetch_general_news()
            for raw_item in general_items:
                article = _store_article(db, raw_item, companies, [])
                if article:
                    stored_count += 1
            db.commit()
        except Exception as exc:
            print(f"  Skipped general news: {exc}")

    finally:
        db.close()

    print(f"Done. Stored {stored_count} new articles.")


if __name__ == "__main__":
    run_ingestion()

"""
Pydantic schemas for API responses (kept separate from the SQLAlchemy models
in models.py -- the API's shape shouldn't have to match the DB's shape).
"""
from datetime import datetime
from pydantic import BaseModel


class CompanyOut(BaseModel):
    id: int
    ticker: str
    name: str
    sector: str | None = None

    class Config:
        from_attributes = True


class ArticleOut(BaseModel):
    id: int
    source: str
    source_url: str
    headline: str
    snippet: str
    published_at: datetime
    label: str | None = None
    confidence: float | None = None
    # FinBERT's three raw class probabilities -- only populated once a
    # sentiment_results row exists for the article (same condition as
    # label/confidence above). This is what the "why we called it X" split
    # bar on article detail and the headline-row split bars are built from.
    prob_positive: float | None = None
    prob_neutral: float | None = None
    prob_negative: float | None = None
    # Tickers this article is linked to (article_company_map), so article
    # detail can show a ticker chip without a second round trip.
    tickers: list[str] = []

    class Config:
        from_attributes = True


class CompanySentimentOut(BaseModel):
    ticker: str
    name: str
    score: float | None
    article_count: int
    # The same aggregation, run over the window immediately preceding this
    # one (i.e. the `days` before the `days` just reported) -- e.g. for
    # days=7 this is "the 7 days before that". Powers the "vs yesterday" /
    # swing figures on the Today digest. None when `days` wasn't given
    # (an all-time score has no well-defined "previous window").
    prev_score: float | None = None


class MarketSentimentOut(BaseModel):
    """Aggregated sentiment across the whole watchlist -- the number behind
    Today's market-mood gauge. Same aggregate_company_sentiment maths as a
    single company, just run over every company's results combined."""

    score: float | None
    article_count: int
    company_count: int
    prev_score: float | None = None


class TrendingCompanyOut(BaseModel):
    ticker: str
    name: str
    article_count: int


class SentimentHistoryPoint(BaseModel):
    date: str  # "YYYY-MM-DD"
    score: float | None
    article_count: int


class TopicOut(BaseModel):
    """One cluster from the lightweight keyword-clustering in app/topics.py.
    `label` is the cluster's most frequent significant keyword/bigram,
    title-cased -- a real (if approximate) signal from the ingested
    headlines, not an invented summary sentence."""

    label: str
    tickers: list[str]
    article_count: int
    score: float | None

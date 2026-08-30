"""
FastAPI backend (report Chapter 4/5). Run:
    uvicorn app.main:app --reload
Then open http://127.0.0.1:8000/docs for interactive API docs (Swagger UI).
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from .database import get_db, init_db
from .models import Company, Article, ArticleCompanyMap, SentimentResult
from .schemas import (
    CompanyOut,
    ArticleOut,
    CompanySentimentOut,
    TrendingCompanyOut,
    SentimentHistoryPoint,
)
from .aggregation import aggregate_company_sentiment, compute_daily_sentiment_series


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Financial News Aggregator API", lifespan=lifespan)

# The React Native app on your phone doesn't need this (native fetch calls
# aren't subject to browser CORS rules), but it's needed the moment you test
# via `expo start --web` in a browser, and costs nothing to have on now.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/companies", response_model=list[CompanyOut])
def list_companies(db: Session = Depends(get_db)):
    return db.query(Company).all()


def _get_company_or_404(db: Session, ticker: str) -> Company:
    company = db.query(Company).filter_by(ticker=ticker.upper()).first()
    if not company:
        raise HTTPException(status_code=404, detail=f"Unknown ticker: {ticker}")
    return company


def _company_sentiment_results(db: Session, company: Company) -> list[dict]:
    """Raw {label, confidence, published_at} rows for a company -- the shared
    input format both aggregate_company_sentiment() and
    compute_daily_sentiment_series() expect. Factored out since the plain
    current-score endpoint and the new history endpoint both need it."""
    rows = (
        db.query(SentimentResult, Article.published_at)
        .join(Article, SentimentResult.article_id == Article.id)
        .join(ArticleCompanyMap, ArticleCompanyMap.article_id == Article.id)
        .filter(ArticleCompanyMap.company_id == company.id, SentimentResult.model_name == "finbert")
        .all()
    )
    return [
        {"label": sr.label, "confidence": sr.confidence, "published_at": published_at}
        for sr, published_at in rows
    ]


@app.get("/companies/{ticker}/sentiment", response_model=CompanySentimentOut)
def company_sentiment(ticker: str, db: Session = Depends(get_db)):
    """Company-level aggregated sentiment score (Chapter 4/5 aggregation logic)."""
    company = _get_company_or_404(db, ticker)
    results = _company_sentiment_results(db, company)
    agg = aggregate_company_sentiment(results)
    return CompanySentimentOut(ticker=company.ticker, name=company.name, **agg)


@app.get("/companies/{ticker}/sentiment/history", response_model=list[SentimentHistoryPoint])
def company_sentiment_history(ticker: str, days: int = 14, db: Session = Depends(get_db)):
    """Daily sentiment timeline for a company -- FR-12, feeds the mobile app's
    sentiment-over-time chart and Chapter 6.3's sensitivity evaluation."""
    company = _get_company_or_404(db, ticker)
    results = _company_sentiment_results(db, company)
    return compute_daily_sentiment_series(results, days=days)


@app.get("/companies/{ticker}/news", response_model=list[ArticleOut])
def company_news(ticker: str, limit: int = 20, db: Session = Depends(get_db)):
    """News feed for one company, most recent first, with sentiment attached."""
    company = _get_company_or_404(db, ticker)

    rows = (
        db.query(Article, SentimentResult)
        .join(ArticleCompanyMap, ArticleCompanyMap.article_id == Article.id)
        .outerjoin(
            SentimentResult,
            (SentimentResult.article_id == Article.id) & (SentimentResult.model_name == "finbert"),
        )
        .filter(ArticleCompanyMap.company_id == company.id)
        .order_by(Article.published_at.desc())
        .limit(limit)
        .all()
    )

    out = []
    for article, sentiment in rows:
        item = ArticleOut.model_validate(article)
        if sentiment:
            item.label = sentiment.label
            item.confidence = sentiment.confidence
        out.append(item)
    return out


@app.get("/articles/{article_id}", response_model=ArticleOut)
def article_detail(article_id: int, db: Session = Depends(get_db)):
    article = db.query(Article).filter_by(id=article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    sentiment = (
        db.query(SentimentResult)
        .filter_by(article_id=article.id, model_name="finbert")
        .first()
    )
    item = ArticleOut.model_validate(article)
    if sentiment:
        item.label = sentiment.label
        item.confidence = sentiment.confidence
    return item


@app.get("/trending", response_model=list[TrendingCompanyOut])
def trending(limit: int = 5, db: Session = Depends(get_db)):
    """Trending companies by recent article volume (Chapter 3 SHOULD-HAVE feature)."""
    rows = (
        db.query(Company, func.count(ArticleCompanyMap.article_id).label("article_count"))
        .join(ArticleCompanyMap, ArticleCompanyMap.company_id == Company.id)
        .group_by(Company.id)
        .order_by(func.count(ArticleCompanyMap.article_id).desc())
        .limit(limit)
        .all()
    )
    return [TrendingCompanyOut(ticker=c.ticker, name=c.name, article_count=count) for c, count in rows]

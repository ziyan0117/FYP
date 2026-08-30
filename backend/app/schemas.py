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

    class Config:
        from_attributes = True


class CompanySentimentOut(BaseModel):
    ticker: str
    name: str
    score: float | None
    article_count: int


class TrendingCompanyOut(BaseModel):
    ticker: str
    name: str
    article_count: int

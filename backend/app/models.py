"""
SQLAlchemy ORM models matching the ERD in the report (Chapter 4.5).

Note: `aliases` is stored as a comma-separated string rather than a native
array column. The ERD sketch used aliases[], but a plain string keeps the
schema identical whether DATABASE_URL points at SQLite (used by default,
no native array type) or PostgreSQL -- a small, deliberate portability
simplification over the original design.
"""
from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint, Float
)
from sqlalchemy.orm import relationship

from .database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True)
    ticker = Column(String(16), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    aliases = Column(Text, default="")  # comma-separated
    sector = Column(String(64), nullable=True)

    article_links = relationship("ArticleCompanyMap", back_populates="company")

    def alias_list(self) -> list[str]:
        return [a.strip() for a in self.aliases.split(",") if a.strip()] if self.aliases else []


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True)
    source = Column(String(128), nullable=False)
    source_url = Column(String(1024), unique=True, nullable=False)
    headline = Column(Text, nullable=False)
    snippet = Column(Text, default="")
    published_at = Column(DateTime, nullable=False)
    ingested_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    content_hash = Column(String(64), unique=True, nullable=False, index=True)

    company_links = relationship("ArticleCompanyMap", back_populates="article")
    sentiment_results = relationship("SentimentResult", back_populates="article")


class ArticleCompanyMap(Base):
    __tablename__ = "article_company_map"

    article_id = Column(Integer, ForeignKey("articles.id"), primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), primary_key=True)
    match_method = Column(String(16), nullable=False)  # "api" or "keyword"

    article = relationship("Article", back_populates="company_links")
    company = relationship("Company", back_populates="article_links")


class SentimentResult(Base):
    __tablename__ = "sentiment_results"
    __table_args__ = (UniqueConstraint("article_id", "model_name", name="uq_article_model"),)

    id = Column(Integer, primary_key=True)
    article_id = Column(Integer, ForeignKey("articles.id"), nullable=False)
    model_name = Column(String(32), nullable=False)  # e.g. "finbert", "vader"
    label = Column(String(16), nullable=False)  # positive / neutral / negative
    confidence = Column(Float, nullable=False)
    prob_positive = Column(Float, nullable=False)
    prob_neutral = Column(Float, nullable=False)
    prob_negative = Column(Float, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    article = relationship("Article", back_populates="sentiment_results")

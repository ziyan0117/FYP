"""
SQLAlchemy engine/session setup. Works unchanged against SQLite (default,
zero setup) or PostgreSQL (set DATABASE_URL) -- this is the whole point of
using an ORM rather than hand-written SQL tied to one database engine.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import DATABASE_URL

# check_same_thread is only needed for SQLite; harmless to pass conditionally.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    """Create all tables if they don't already exist."""
    from . import models  # noqa: F401  (ensures models are registered on Base)
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency: yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

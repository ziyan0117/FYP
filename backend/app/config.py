"""
Central configuration, loaded from environment variables (see .env.example).
Uses python-dotenv so a local .env file works without extra setup.
"""
import os
from dotenv import load_dotenv

load_dotenv()

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "")
NEWSAPI_API_KEY = os.getenv("NEWSAPI_API_KEY", "")  # optional secondary source

# Default to a local SQLite file so the project runs with zero database setup.
# Point this at a Postgres URL later (e.g. from Supabase/Neon) without changing
# any other code, e.g.:
#   DATABASE_URL=postgresql://user:password@host:5432/dbname
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./finnews.db")

# How many days back to pull news for on each ingestion run.
NEWS_LOOKBACK_DAYS = int(os.getenv("NEWS_LOOKBACK_DAYS", "3"))

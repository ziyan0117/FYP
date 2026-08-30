# Backend: News Ingestion, Preprocessing, Ticker Matching, Database, API

This is Step 2+ of the project (the FinBERT proof-of-concept in `finbert_poc/` was Step 1).
It turns that standalone classifier into a real pipeline: pull news → clean it → work out
which companies it's about → classify sentiment → store it → serve it over an API.

## What's in here

```
backend/
  app/
    config.py           # env-var configuration (API keys, DB URL)
    database.py          # SQLAlchemy engine/session (SQLite by default, Postgres-ready)
    models.py             # ORM tables: companies, articles, article_company_map, sentiment_results
    preprocessing.py      # text cleaning + dedup hashing
    ticker_matching.py    # rule-based company/ticker matcher (API tags + keyword fallback)
    sentiment.py           # FinBERT wrapper (lazy-loaded, returns full probability distribution)
    finnhub_client.py      # Finnhub API calls
    aggregation.py         # article-level sentiment -> company-level score
    schemas.py              # API response shapes (Pydantic)
    ingest.py                # orchestrates the whole pipeline end to end
  tests/
    test_ticker_matching.py   # pure Python, no deps -- already verified, all pass
    test_preprocessing.py     # pure Python, no deps -- already verified, all pass
    test_aggregation.py       # pure Python, no deps -- already verified, all pass
  seed_companies.py       # one-time script to populate the watchlist
  requirements.txt
  .env.example
```

Each module maps directly onto a piece of the Chapter 4 architecture diagram: sources →
ingestion (`ingest.py` + `finnhub_client.py`) → preprocessing (`preprocessing.py` +
`ticker_matching.py`) → sentiment model (`sentiment.py`) → database (`models.py`,
`database.py`) → backend API (`app/main.py`, not listed above — see below).

## Why it's built this way

- **SQLite by default, Postgres-ready** — `DATABASE_URL` defaults to a local SQLite file so
  the whole thing runs with zero database setup. Point it at a free Postgres instance
  (Supabase, Neon, Railway) later by changing one line in `.env` — none of the model or
  query code needs to change, because SQLAlchemy abstracts the SQL dialect.
- **Ticker matching is rule-based, not ML** — deliberately, per the project's scope
  decisions. It's fully unit-tested (`tests/test_ticker_matching.py`) so its correctness
  doesn't depend on the sentiment model at all, and it's what Chapter 6.2's evaluation
  audits against a manually verified sample.
- **`sentiment_results` stores all three probabilities**, not just the winning label — the
  aggregation formula and the future "why is this negative" feature both need the full
  distribution, not a single number.
- **`sentiment.py` imports `transformers` lazily** — so you can import and test everything
  else in this project without torch/transformers installed; only actually calling
  `classify()` needs them.

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and add your Finnhub API key (free, from https://finnhub.io — sign up, the key
is on your dashboard). Leave `DATABASE_URL` as-is to use SQLite.

## Running it, in order

**1. Run the tests that don't need any API keys or the model** — do this first to confirm
the environment is set up correctly:

```bash
pytest tests/ -v
```

Expected: all 15 tests pass (I've already verified this exact test suite passes in my own
environment — if it fails in yours, it's an environment issue, not a logic bug, so worth
sorting out before moving on).

**2. Seed the company watchlist:**

```bash
python seed_companies.py
```

Expected output: `Seeded. Watchlist now has 10 companies.` This creates `finnews.db` (a
SQLite file) in the `backend/` folder — that's your whole database, visible as one file.

**3. Run the ingestion pipeline:**

```bash
python -m app.ingest
```

This is the slow one — the first run downloads FinBERT (~440MB) the same as the Step 1
proof-of-concept, then fetches news for all 10 watchlist companies plus general market news,
classifying each relevant article as it goes. Expected output: a line per company
("Fetching news for AAPL...") and a final `Done. Stored N new articles.` line. Run it again
later and N will be smaller or zero, since already-seen articles are skipped by content hash.

**4. Start the API:**

```bash
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs` in a browser — this is FastAPI's automatic interactive
documentation (Swagger UI). Try `GET /companies`, then `GET /companies/AAPL/sentiment`, then
`GET /companies/AAPL/news`, then `GET /trending`. Each should return real JSON built from
whatever `python -m app.ingest` actually pulled in step 3.

## What successful output looks like

- `pytest tests/ -v` → 15 passed, 0 failed.
- `python seed_companies.py` → watchlist count printed, no errors.
- `python -m app.ingest` → per-company fetch lines, then a "Stored N new articles" summary
  with N > 0 (assuming your Finnhub key is valid and at least some watchlist companies had
  recent news).
- `GET /companies/AAPL/sentiment` → something like
  `{"ticker": "AAPL", "name": "Apple", "score": 0.42, "article_count": 7}`.
- `GET /trending` → a list of companies ordered by how much news they've had, most first.

## Troubleshooting

- **`RuntimeError: FINNHUB_API_KEY is not set`** — you haven't filled in `.env`, or you're
  running from a different working directory than `backend/` (dotenv looks for `.env` in the
  current directory).
- **`ModuleNotFoundError` for fastapi/sqlalchemy/etc.** — the venv isn't activated, or `pip
  install -r requirements.txt` didn't finish. Same failure mode as the Step 1 proof-of-concept.
- **`python -m app.ingest` runs but stores 0 articles** — check the per-company output for
  `Skipped <TICKER>: ...` lines, which usually mean an invalid API key or a Finnhub rate
  limit; also possible that none of your watchlist companies simply had news in the lookback
  window (`NEWS_LOOKBACK_DAYS`, default 3 — try increasing it).
- **`sqlite3.OperationalError: database is locked`** — don't run `python -m app.ingest` and
  the API server against the same SQLite file at the exact same moment for now; this is a
  known SQLite limitation under concurrent writes and won't come up once/if you move to
  Postgres.
- **Port 8000 already in use** — run `uvicorn app.main:app --reload --port 8001` instead.

## What's deliberately not here yet

The mobile frontend, the sentiment-over-time endpoint (the aggregation function supports it,
but no route calls it with a date-bucketed query yet), and the trending-topics keyword
extraction — these are the next steps after this one, per the project's build order. This
step's job is ingestion → preprocessing → ticker matching → database → API, and that's what's
here.

"""
One-time script to seed the initial company watchlist. Run:
    python seed_companies.py

Adjust WATCHLIST to whichever companies you want the MVP to cover -- these
ten are a reasonable Gen-Z-relevant starting set (well-known consumer/tech
names likely to generate frequent news), not a fixed requirement.
"""
from app.database import SessionLocal, init_db
from app.models import Company

WATCHLIST = [
    ("AAPL", "Apple", "Apple Inc"),
    ("TSLA", "Tesla", ""),
    ("NVDA", "NVIDIA", "Nvidia"),
    ("MSFT", "Microsoft", ""),
    ("AMZN", "Amazon", "Amazon.com"),
    ("GOOGL", "Alphabet", "Google"),
    ("META", "Meta", "Facebook"),
    ("NFLX", "Netflix", ""),
    ("AMD", "AMD", "Advanced Micro Devices"),
    ("PLTR", "Palantir", "Palantir Technologies"),
]


def seed():
    init_db()
    db = SessionLocal()
    try:
        for ticker, name, aliases in WATCHLIST:
            if db.query(Company).filter_by(ticker=ticker).first():
                continue
            db.add(Company(ticker=ticker, name=name, aliases=aliases))
        db.commit()
        print(f"Seeded. Watchlist now has {db.query(Company).count()} companies.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()

"""
Quick manual-evaluation tool for the ticker-matching rule engine (report
Chapter 6.2). Looks up an ingested article by a headline substring (or by
its numeric id) and prints exactly which companies it was linked to and,
critically, *how* -- "api" (the news source's own related-ticker tag) or
"keyword" (our word-boundary match against ticker/name/aliases) -- plus the
full, untruncated headline/snippet text so you can judge for yourself
whether the link is actually correct.

Usage (run from the backend/ directory, same place you run uvicorn):
    python -m scripts.inspect_ticker_match "PayPal deal talks"
    python -m scripts.inspect_ticker_match --id 5

No extra dependencies -- uses the same DATABASE_URL as the running app via
sqlite3 directly against the SQLite file (for a Postgres DATABASE_URL,
switch to the SQLAlchemy session objects instead -- ask if you need that
version).
"""
import argparse
import sqlite3
import sys
import textwrap
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "finnews.db"


def inspect(cur, article_id: int) -> None:
    cur.execute(
        "SELECT id, source, headline, snippet, source_url, published_at "
        "FROM articles WHERE id = ?",
        (article_id,),
    )
    article = cur.fetchone()
    if not article:
        print(f"No article with id={article_id}")
        return

    print(f"--- article id={article['id']} ---")
    print(f"source        : {article['source']}")
    print(f"published_at  : {article['published_at']}")
    print(f"headline      : {article['headline']}")
    print("snippet (full, untruncated):")
    print(textwrap.indent(textwrap.fill(article["snippet"] or "(empty)", 90), "  "))
    print(f"source_url    : {article['source_url']}")
    print()

    cur.execute(
        """
        SELECT c.ticker, c.name, c.aliases, m.match_method
        FROM article_company_map m
        JOIN companies c ON c.id = m.company_id
        WHERE m.article_id = ?
        ORDER BY c.ticker
        """,
        (article_id,),
    )
    links = cur.fetchall()
    if not links:
        print("linked companies: none")
    else:
        print("linked companies:")
        for link in links:
            print(
                f"  {link['ticker']:<6} {link['name']:<24} "
                f"match_method={link['match_method']:<8} aliases={link['aliases'] or '-'}"
            )
    print()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query", nargs="?", help="Substring to search for in the headline")
    parser.add_argument("--id", type=int, help="Look up one article by its exact id")
    args = parser.parse_args()

    if not DB_PATH.exists():
        sys.exit(f"Database not found at {DB_PATH} -- run this from the backend/ directory.")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    if args.id is not None:
        inspect(cur, args.id)
        return

    if not args.query:
        parser.error("pass a headline substring, or --id <article_id>")

    cur.execute(
        "SELECT id, headline FROM articles WHERE headline LIKE ? ORDER BY published_at DESC",
        (f"%{args.query}%",),
    )
    matches = cur.fetchall()
    if not matches:
        print(f"No article headline contains {args.query!r}")
        return

    for m in matches:
        inspect(cur, m["id"])


if __name__ == "__main__":
    main()

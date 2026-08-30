"""
Diagnostic tool for the sentiment-classification rule engine's ML component
(report Chapter 6/7): probes whether FinBERT's label for a headline+snippet
pair depends on the order the snippet's sentences are presented in, rather
than on the facts they state.

Built after manually discovering that a real ingested AAPL article --
"John Ternus Becomes Apple's CEO on Sept. 1. Here's What History Says the
First Year Does to the Stock." with snippet "Four planned megacap handoffs
have a complete first year on record. The worst lost 38%. The best gained
76%." -- was classified NEGATIVE (81% confidence), even though the headline
alone reads NEUTRAL, and a hand-run comparison showed the label flips to
POSITIVE if the snippet's two comparative sentences are simply swapped, with
no change to the underlying facts. See Chapter 4 of the report for the full
write-up.

Usage (run from the backend/ directory, same place you run uvicorn):
    python -m scripts.probe_sentiment_order \\
        --headline "John Ternus Becomes Apple's CEO on Sept. 1. Here's What History Says the First Year Does to the Stock." \\
        --snippet "Four planned megacap handoffs have a complete first year on record. The worst lost 38%. The best gained 76%."

    python -m scripts.probe_sentiment_order --id 5

Runs three classifications and reports whether the label held steady or
changed between the "as ingested" and "sentences reversed" variants:
  1. Headline alone (a no-comparative-content control).
  2. Headline + snippet, concatenated exactly as ingest.py does it.
  3. Headline + snippet with the snippet's sentences reversed -- same facts,
     opposite presentation order.

No extra dependencies beyond what the project already requires
(transformers/torch for classify(); sqlite3 is stdlib, used only for --id).
"""
import argparse
import sqlite3
import sys
from pathlib import Path

from app.sentiment import classify

DB_PATH = Path(__file__).resolve().parent.parent / "finnews.db"


def _reverse_sentences(text: str) -> str:
    """
    Keep the first sentence fixed (news snippets conventionally lead with a
    context-setting sentence) and reverse the order of whatever sentences
    follow it. For a 2-sentence snippet this simply swaps the two; for 3+
    sentences it leaves the lead sentence in place and reverses the rest --
    exactly the transformation manually verified to flip FinBERT's label on
    the documented AAPL example (Chapter 4): "Four planned megacap handoffs
    have a complete first year on record. The worst lost 38%. The best
    gained 76%." becomes "...record. The best gained 76%. The worst lost
    38%." A snippet with 0-1 sentences has nothing to reorder.
    """
    had_trailing_period = text.strip().endswith(".")
    sentences = [s.strip().rstrip(".") for s in text.split(".") if s.strip()]

    if len(sentences) > 2:
        sentences = [sentences[0]] + list(reversed(sentences[1:]))
    else:
        sentences = list(reversed(sentences))

    joined = ". ".join(sentences)
    return joined + "." if had_trailing_period else joined


def _lookup_article(article_id: int) -> tuple[str, str]:
    if not DB_PATH.exists():
        sys.exit(f"Database not found at {DB_PATH} -- run this from the backend/ directory.")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT headline, snippet FROM articles WHERE id = ?", (article_id,))
    row = cur.fetchone()
    if not row:
        sys.exit(f"No article with id={article_id}")
    return row["headline"], row["snippet"] or ""


def probe(headline: str, snippet: str) -> None:
    reversed_snippet = _reverse_sentences(snippet)

    variants = [
        ("headline alone", headline),
        ("headline + snippet (as ingested)", f"{headline}. {snippet}".strip()),
        ("headline + snippet (sentences reversed)", f"{headline}. {reversed_snippet}".strip()),
    ]

    print(f"Headline: {headline}")
    print(f"Snippet:  {snippet}")
    print(f"Reversed: {reversed_snippet}")
    print()

    results = {}
    for label, text in variants:
        result = classify(text)
        results[label] = result
        print(f"--- {label} ---")
        print(f"  text: {text}")
        print(
            f"  -> label={result['label']:<8} confidence={result['confidence']:.4f} "
            f"(pos={result['prob_positive']:.4f} neu={result['prob_neutral']:.4f} "
            f"neg={result['prob_negative']:.4f})"
        )
        print()

    as_ingested = results["headline + snippet (as ingested)"]
    reversed_ = results["headline + snippet (sentences reversed)"]

    if as_ingested["label"] != reversed_["label"]:
        print(
            f"ORDER-SENSITIVE: label changed from {as_ingested['label'].upper()} to "
            f"{reversed_['label'].upper()} purely by reversing sentence order in the "
            f"snippet -- the underlying facts did not change. This is a genuine FinBERT "
            f"limitation on comparative/two-sided text, not a bug in the pipeline."
        )
    else:
        print(
            f"Label held steady ({as_ingested['label'].upper()}) across both sentence "
            f"orderings for this article -- no order-sensitivity detected here."
        )


def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--headline", help="The article headline")
    parser.add_argument("--snippet", help="The article snippet/summary")
    parser.add_argument("--id", type=int, help="Look up headline/snippet from finnews.db by article id")
    args = parser.parse_args()

    if args.id is not None:
        headline, snippet = _lookup_article(args.id)
    elif args.headline and args.snippet:
        headline, snippet = args.headline, args.snippet
    else:
        parser.error("pass --headline and --snippet, or --id <article_id>")

    probe(headline, snippet)


if __name__ == "__main__":
    main()

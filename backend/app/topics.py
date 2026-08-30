"""
Lightweight topic clustering (v1 heuristic -- no external NLP dependency).

Groups recently-ingested headlines that share a common significant phrase
into "topics", e.g. several tickers' headlines all mentioning "price cuts"
or "data centre". This is a genuinely simple approach on purpose:

  1. Tokenize each article's headline + snippet, drop stopwords and any
     word that's just a ticker/company name (those aren't a *topic*, they're
     the company the topic is already grouped under).
  2. Count how many distinct articles each bigram (adjacent word pair)
     appears in -- bigrams read as more topic-shaped than single words
     ("price cuts" vs "cuts").
  3. Greedily walk candidate bigrams most-articles-first, claiming each
     unclaimed article that contains it into that topic. Every article ends
     up in at most one topic (or none, if nothing it shares meets the
     article-count floor).
  4. Aggregate each topic's member articles with the same
     aggregate_company_sentiment() used everywhere else, and label the topic
     with its bigram, title-cased.

This will not produce human-quality topic names ("AI capex is still going
up") -- it produces the real keyword driving the cluster ("Data Centre",
"Price Cuts"). That's the trade-off for not inventing a summary that isn't
backed by anything the pipeline actually computed. Revisit with a real
clustering/keyphrase model (Chapter-future-work territory) once there's
enough ingested volume for one to be worth training or calling out to.
"""
import re
from collections import Counter, defaultdict

from .aggregation import aggregate_company_sentiment

_WORD_RE = re.compile(r"[a-z][a-z'-]+")

_STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "if", "then", "than", "as", "at",
    "by", "for", "from", "in", "into", "is", "it", "its", "of", "on", "onto",
    "over", "per", "so", "than", "that", "this", "to", "up", "down", "vs",
    "with", "within", "without", "amid", "amidst", "after", "before", "about",
    "again", "against", "are", "be", "been", "being", "between", "both",
    "can", "could", "did", "do", "does", "each", "further", "had", "has",
    "have", "having", "he", "her", "here", "hers", "herself", "him",
    "himself", "his", "how", "i", "just", "me", "more", "most", "my",
    "myself", "no", "nor", "not", "now", "off", "once", "only", "other",
    "our", "ours", "ourselves", "out", "over", "own", "s", "same", "she",
    "should", "some", "such", "t", "their", "theirs", "them", "themselves",
    "there", "these", "they", "those", "through", "too", "under", "until",
    "very", "was", "we", "were", "what", "when", "where", "which", "while",
    "who", "whom", "why", "will", "would", "you", "your", "yours",
    "yourself", "yourselves", "new", "says", "say", "said", "report",
    "reports", "reported", "week", "quarter", "year", "years", "day",
    "days", "million", "billion", "percent",
}


def _stem(word: str) -> str:
    """Naive plural-stripping so "price cuts" and "price cut" (or "prices")
    collide into the same bigram. Not a real stemmer -- just enough to stop
    the most common miss (a bare trailing 's') from splitting one topic into
    two undersized ones."""
    if len(word) > 3 and word.endswith("s") and not word.endswith("ss"):
        return word[:-1]
    return word


def _tokens(text: str, exclude: set[str]) -> list[str]:
    words = [w for w in _WORD_RE.findall(text.lower()) if w not in _STOPWORDS]
    return [_stem(w) for w in words if w not in exclude]


def cluster_topics(
    articles: list[dict],
    company_terms: set[str],
    limit: int = 5,
    min_articles: int = 2,
) -> list[dict]:
    """
    `articles`: one dict per article, each with
        {"id", "headline", "snippet", "tickers": [str], "label", "confidence",
         "published_at"}
    `company_terms`: lowercased ticker/name/alias strings to exclude from
        candidate phrases (so a topic isn't just "nvidia nvidia").
    `min_articles`: a bigram needs to appear in at least this many distinct,
        still-unclaimed articles to become a topic -- below that it's noise,
        not a trend.

    Returns topic dicts sorted by article_count desc, capped to `limit`:
        {"label", "tickers": [...], "article_count", "score"}
    """
    # word-pair (order-independent, so "price cuts" and "cuts in price" both
    # land on the same key) -> set of article indices that contain it, plus
    # a tally of the original left-to-right phrasing so the label reads
    # naturally instead of alphabetically ("price cut" not "cut price").
    bigram_articles: dict[tuple[str, str], set[int]] = defaultdict(set)
    phrasing_votes: dict[tuple[str, str], Counter] = defaultdict(Counter)
    for idx, art in enumerate(articles):
        text = f"{art.get('headline', '')} {art.get('snippet', '')}"
        words = _tokens(text, company_terms)
        seen_here = set()
        for a, b in zip(words, words[1:]):
            if len(a) < 3 or len(b) < 3 or a == b:
                continue
            key = tuple(sorted((a, b)))
            seen_here.add(key)
            phrasing_votes[key][f"{a} {b}"] += 1
        for pair in seen_here:
            bigram_articles[pair].add(idx)

    ranked = sorted(
        bigram_articles.items(), key=lambda kv: (-len(kv[1]), kv[0])
    )

    claimed: set[int] = set()
    topics: list[dict] = []
    for pair, idxs in ranked:
        phrase = phrasing_votes[pair].most_common(1)[0][0]
        available = idxs - claimed
        if len(available) < min_articles:
            continue
        claimed |= available
        members = [articles[i] for i in available]
        tickers = sorted({t for m in members for t in m.get("tickers", [])})
        agg = aggregate_company_sentiment(
            [
                {
                    "label": m["label"],
                    "confidence": m["confidence"],
                    "published_at": m["published_at"],
                }
                for m in members
                if m.get("label") and m.get("confidence") is not None
            ]
        )
        topics.append(
            {
                "label": phrase.title(),
                "tickers": tickers,
                "article_count": len(members),
                "score": agg["score"],
            }
        )

    topics.sort(key=lambda t: t["article_count"], reverse=True)
    return topics[:limit]

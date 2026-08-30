"""
Rule-based company/ticker matching (report Chapter 4.4/4.5; evaluated in
Chapter 6.2 against a manually verified sample).

Two match methods, recorded per link so the evaluation can tell them apart:
  - "api":     the news API already tagged the article with this ticker
  - "keyword": found via a case-insensitive, word-boundary match of the
               company's ticker, name, or aliases against the article text

This module has no external dependencies, deliberately -- it's the one part
of the pipeline that's fully unit-testable without installing anything
(see tests/test_ticker_matching.py).
"""
import re
from dataclasses import dataclass, field
from typing import Iterable


@dataclass
class Company:
    id: int
    ticker: str
    name: str
    aliases: list[str] = field(default_factory=list)


def _word_boundary_pattern(term: str) -> re.Pattern:
    return re.compile(rf"\b{re.escape(term)}\b", re.IGNORECASE)


def keyword_match(text: str, companies: Iterable[Company]) -> list[Company]:
    """Return every company whose ticker/name/alias appears in `text`."""
    matches = []
    for company in companies:
        terms = [company.name, *company.aliases]
        # Only match the bare ticker if it's at least 2 characters, to cut
        # down on single-letter false positives (e.g. a ticker like "A").
        if len(company.ticker) >= 2:
            terms.append(company.ticker)
        for term in terms:
            if term and _word_boundary_pattern(term).search(text):
                matches.append(company)
                break
    return matches


def match_article_to_companies(
    headline: str,
    snippet: str,
    api_symbols: list[str],
    companies: Iterable[Company],
) -> list[tuple[Company, str]]:
    """
    Combine API-provided ticker tags with the keyword fallback.

    Returns a list of (Company, match_method) pairs, deduplicated by company
    id -- if both the API and the keyword match agree on a company, the API
    tag wins and is recorded as the match method, since it's the more
    reliable of the two.
    """
    text = f"{headline} {snippet}"
    results: dict[int, tuple[Company, str]] = {}

    api_symbol_set = {s.upper() for s in api_symbols}
    for company in companies:
        if company.ticker.upper() in api_symbol_set:
            results[company.id] = (company, "api")

    for company in keyword_match(text, companies):
        if company.id not in results:
            results[company.id] = (company, "keyword")

    return list(results.values())

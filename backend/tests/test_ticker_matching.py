"""
Unit tests for the rule-based ticker/company matcher. Pure Python, no
external dependencies -- run with:
    pytest tests/test_ticker_matching.py -v
"""
from app.ticker_matching import Company, keyword_match, match_article_to_companies


def make_companies():
    return [
        Company(id=1, ticker="AAPL", name="Apple", aliases=["Apple Inc"]),
        Company(id=2, ticker="TSLA", name="Tesla", aliases=[]),
        Company(id=3, ticker="META", name="Meta", aliases=["Facebook"]),
    ]


def test_keyword_match_by_name():
    matches = keyword_match("Apple shares surge after strong iPhone sales", make_companies())
    assert [c.ticker for c in matches] == ["AAPL"]


def test_keyword_match_by_alias():
    matches = keyword_match("Facebook parent reports strong ad revenue", make_companies())
    assert [c.ticker for c in matches] == ["META"]


def test_no_false_positive_on_unrelated_text():
    matches = keyword_match("The weather today is sunny and mild", make_companies())
    assert matches == []


def test_api_symbol_and_keyword_can_both_match_different_companies():
    result = match_article_to_companies(
        headline="Tesla and Apple both rally in early trading",
        snippet="",
        api_symbols=["TSLA"],
        companies=make_companies(),
    )
    by_ticker = {c.ticker: method for c, method in result}
    assert by_ticker["TSLA"] == "api"
    assert by_ticker["AAPL"] == "keyword"


def test_api_tag_wins_when_both_would_match_same_company():
    result = match_article_to_companies(
        headline="Apple stock update",
        snippet="",
        api_symbols=["AAPL"],
        companies=make_companies(),
    )
    assert len(result) == 1
    assert result[0][1] == "api"

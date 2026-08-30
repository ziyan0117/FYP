"""
Unit tests for text cleaning and deduplication. Pure Python, no external
dependencies -- run with:
    pytest tests/test_preprocessing.py -v
"""
from app.preprocessing import clean_text, compute_content_hash


def test_clean_text_strips_html_and_collapses_whitespace():
    raw = "<p>Apple   reports  <b>record</b> profits.</p>\n\n"
    assert clean_text(raw) == "Apple reports record profits."


def test_clean_text_unescapes_html_entities():
    assert clean_text("Q&amp;A with the CEO") == "Q&A with the CEO"


def test_clean_text_handles_empty_input():
    assert clean_text("") == ""
    assert clean_text(None) == ""


def test_content_hash_is_stable():
    h1 = compute_content_hash("https://example.com/a", "Some Headline")
    h2 = compute_content_hash("https://example.com/a", "Some Headline")
    assert h1 == h2


def test_content_hash_is_case_insensitive():
    h1 = compute_content_hash("https://Example.com/A", "SOME HEADLINE")
    h2 = compute_content_hash("https://example.com/a", "some headline")
    assert h1 == h2


def test_content_hash_differs_for_different_headline():
    h1 = compute_content_hash("https://example.com/a", "Headline One")
    h2 = compute_content_hash("https://example.com/a", "Headline Two")
    assert h1 != h2

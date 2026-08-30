"""
Unit tests for the SerpApi secondary-news-source client. Pure Python +
unittest.mock -- no real network access or API key needed. Run with:
    pytest tests/test_serpapi_client.py -v

Covers: the request shape sent to SerpApi, missing-API-key handling, date
filtering against lookback_days, absolute vs. relative date parsing, and
that malformed/undated items are dropped rather than stored with a guessed
timestamp.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock

from app.serpapi_client import fetch_company_news_serpapi, _parse_published_at


def _mock_response(payload):
    resp = MagicMock()
    resp.raise_for_status.return_value = None
    resp.json.return_value = payload
    return resp


def _news_result(**overrides):
    item = {
        "title": "Some headline",
        "snippet": "Some snippet",
        "source": "Example News",
        "link": "https://example.com/article",
        "date": "1 day ago",
    }
    item.update(overrides)
    return item


def test_missing_api_key_raises_before_any_request():
    with patch("app.serpapi_client.SERPAPI_API_KEY", ""), \
         patch("app.serpapi_client.requests.get") as mock_get:
        try:
            fetch_company_news_serpapi("Apple", lookback_days=3)
            assert False, "expected RuntimeError"
        except RuntimeError:
            pass
        assert mock_get.call_count == 0


def test_request_uses_google_news_tab_with_company_query():
    with patch("app.serpapi_client.SERPAPI_API_KEY", "fake-key"), \
         patch("app.serpapi_client.requests.get") as mock_get:
        mock_get.return_value = _mock_response({"news_results": []})

        fetch_company_news_serpapi("Apple", lookback_days=3)

        assert mock_get.call_count == 1
        _, kwargs = mock_get.call_args
        params = kwargs["params"]
        assert params["engine"] == "google"
        assert params["tbm"] == "nws"
        assert params["api_key"] == "fake-key"
        assert "Apple" in params["q"]


def test_normalizes_result_into_finnhub_compatible_shape():
    published = datetime.now(timezone.utc) - timedelta(hours=2)
    absolute_str = published.strftime("%Y-%m-%d %H:%M:%S") + " UTC"

    with patch("app.serpapi_client.SERPAPI_API_KEY", "fake-key"), \
         patch("app.serpapi_client.requests.get") as mock_get:
        mock_get.return_value = _mock_response({
            "news_results": [_news_result(published_at=absolute_str)]
        })

        result = fetch_company_news_serpapi("Apple", lookback_days=3)

        assert len(result) == 1
        article = result[0]
        assert article["headline"] == "Some headline"
        assert article["summary"] == "Some snippet"
        assert article["source"] == "Example News"
        assert article["url"] == "https://example.com/article"
        assert article["related"] == ""  # SerpApi never tags related tickers
        assert isinstance(article["datetime"], int)


def test_articles_outside_lookback_window_are_dropped():
    too_old = datetime.now(timezone.utc) - timedelta(days=10)
    absolute_str = too_old.strftime("%Y-%m-%d %H:%M:%S") + " UTC"

    with patch("app.serpapi_client.SERPAPI_API_KEY", "fake-key"), \
         patch("app.serpapi_client.requests.get") as mock_get:
        mock_get.return_value = _mock_response({
            "news_results": [_news_result(published_at=absolute_str)]
        })

        result = fetch_company_news_serpapi("Apple", lookback_days=3)

        assert result == []


def test_items_with_no_parseable_date_are_dropped():
    with patch("app.serpapi_client.SERPAPI_API_KEY", "fake-key"), \
         patch("app.serpapi_client.requests.get") as mock_get:
        mock_get.return_value = _mock_response({
            "news_results": [_news_result(date="a long time ago in a galaxy far away")]
        })

        result = fetch_company_news_serpapi("Apple", lookback_days=3)

        assert result == []


def test_serpapi_error_status_raises():
    with patch("app.serpapi_client.SERPAPI_API_KEY", "fake-key"), \
         patch("app.serpapi_client.requests.get") as mock_get:
        mock_get.return_value = _mock_response({
            "search_metadata": {"status": "Error"},
            "error": "Invalid API key.",
        })

        try:
            fetch_company_news_serpapi("Apple", lookback_days=3)
            assert False, "expected RuntimeError"
        except RuntimeError as exc:
            assert "Invalid API key" in str(exc)


# -- _parse_published_at directly --

def test_parse_published_at_prefers_absolute_field():
    item = {"published_at": "2026-08-20 09:22:45 UTC", "date": "3 hours ago"}
    parsed = _parse_published_at(item)
    assert parsed == datetime(2026, 8, 20, 9, 22, 45, tzinfo=timezone.utc)


def test_parse_published_at_falls_back_to_relative_date():
    before = datetime.now(timezone.utc)
    item = {"date": "2 hours ago"}
    parsed = _parse_published_at(item)
    after = datetime.now(timezone.utc)

    assert parsed is not None
    # parsed should be ~2 hours before "now", bounded by the test's own runtime.
    assert before - timedelta(hours=2, seconds=5) <= parsed <= after - timedelta(hours=2) + timedelta(seconds=5)


def test_parse_published_at_returns_none_when_unparseable():
    assert _parse_published_at({"date": "sometime"}) is None
    assert _parse_published_at({}) is None

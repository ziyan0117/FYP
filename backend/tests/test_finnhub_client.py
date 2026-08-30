"""
Unit tests for the Finnhub date-chunking logic in finnhub_client.py. Pure
Python + unittest.mock -- no real network access or API key needed. Run
with:
    pytest tests/test_finnhub_client.py -v

Context: Finnhub's free-tier /company-news endpoint appears to silently cap
how much history it returns per single call (observed ~30 days even when a
wider `from`/`to` range is requested). These tests verify the chunking
workaround in fetch_company_news() makes the right number of calls, with
the right non-overlapping date windows, and combines all chunks' results --
without needing to hit the real API to prove it.
"""
from datetime import date, timedelta
from unittest.mock import patch, MagicMock

from app import finnhub_client
from app.finnhub_client import fetch_company_news, CHUNK_DAYS


def _mock_response(payload):
    resp = MagicMock()
    resp.raise_for_status.return_value = None
    resp.json.return_value = payload
    return resp


def test_short_lookback_makes_exactly_one_call():
    """lookback_days below CHUNK_DAYS (e.g. the default 3-day case) should
    behave exactly like the old single-call implementation -- no extra API
    calls for the common case."""
    with patch("app.finnhub_client.FINNHUB_API_KEY", "fake-key"), \
         patch("app.finnhub_client.requests.get") as mock_get:
        mock_get.return_value = _mock_response([{"headline": "a"}])

        result = fetch_company_news("AAPL", lookback_days=3)

        assert mock_get.call_count == 1
        assert result == [{"headline": "a"}]

        _, kwargs = mock_get.call_args
        params = kwargs["params"]
        today = date.today()
        assert params["to"] == today.isoformat()
        assert params["from"] == (today - timedelta(days=3)).isoformat()


def test_long_lookback_is_split_into_chunks_covering_the_full_range():
    """A 90-day lookback (3x CHUNK_DAYS) should make 3 calls, and the union
    of the chunks' [from, to] windows should cover the entire requested
    range with no gaps."""
    with patch("app.finnhub_client.FINNHUB_API_KEY", "fake-key"), \
         patch("app.finnhub_client.requests.get") as mock_get:
        mock_get.return_value = _mock_response([])

        lookback_days = 90
        fetch_company_news("AAPL", lookback_days=lookback_days)

        assert mock_get.call_count == 3

        today = date.today()
        range_start = today - timedelta(days=lookback_days)

        windows = []
        for _, kwargs in mock_get.call_args_list:
            params = kwargs["params"]
            windows.append((date.fromisoformat(params["from"]), date.fromisoformat(params["to"])))

        # Most recent window ends today.
        assert windows[0][1] == today
        # Oldest window starts exactly at the full requested range's start.
        assert windows[-1][0] == range_start
        # No window is wider than CHUNK_DAYS.
        for start, end in windows:
            assert (end - start).days <= CHUNK_DAYS
        # Windows are contiguous (each next window ends the day before the
        # previous one started) -- full coverage, no gaps, no overlap.
        for i in range(len(windows) - 1):
            assert windows[i + 1][1] == windows[i][0] - timedelta(days=1)


def test_results_from_all_chunks_are_combined():
    """Articles returned by every chunk call should all end up in the final
    combined list."""
    with patch("app.finnhub_client.FINNHUB_API_KEY", "fake-key"), \
         patch("app.finnhub_client.requests.get") as mock_get:
        mock_get.side_effect = [
            _mock_response([{"headline": "recent"}]),
            _mock_response([{"headline": "mid"}]),
            _mock_response([{"headline": "old"}]),
        ]

        result = fetch_company_news("AAPL", lookback_days=90)

        assert result == [{"headline": "recent"}, {"headline": "mid"}, {"headline": "old"}]


def test_sleeps_between_chunk_calls_but_not_before_the_first():
    """The rate-limit delay should happen between calls, not before the
    first one -- so a short lookback (1 call) never sleeps at all."""
    with patch("app.finnhub_client.FINNHUB_API_KEY", "fake-key"), \
         patch("app.finnhub_client.requests.get") as mock_get, \
         patch("app.finnhub_client.time.sleep") as mock_sleep:
        mock_get.return_value = _mock_response([])

        fetch_company_news("AAPL", lookback_days=3)
        assert mock_sleep.call_count == 0

        mock_sleep.reset_mock()
        fetch_company_news("AAPL", lookback_days=90)
        assert mock_sleep.call_count == 2  # 3 calls -> 2 gaps between them


def test_missing_api_key_raises_before_any_request():
    with patch("app.finnhub_client.FINNHUB_API_KEY", ""), \
         patch("app.finnhub_client.requests.get") as mock_get:
        try:
            fetch_company_news("AAPL", lookback_days=3)
            assert False, "expected RuntimeError"
        except RuntimeError:
            pass
        assert mock_get.call_count == 0

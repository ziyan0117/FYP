"""
Text cleaning and deduplication helpers (report Chapter 4.4, "Preprocessing").
"""
import hashlib
import html
import re

_WHITESPACE_RE = re.compile(r"\s+")
_HTML_TAG_RE = re.compile(r"<[^>]+>")


def clean_text(raw: str) -> str:
    """Strip HTML tags/entities and collapse whitespace."""
    if not raw:
        return ""
    text = html.unescape(raw)
    text = _HTML_TAG_RE.sub(" ", text)
    text = _WHITESPACE_RE.sub(" ", text).strip()
    return text


def compute_content_hash(source_url: str, headline: str) -> str:
    """
    A stable deduplication key combining the source URL and the headline
    (both lowercased) so that:
      - the same article ingested twice (e.g. re-fetched on the next
        scheduled run) is recognised and skipped, and
      - two different URLs carrying an identical headline from wire
        syndication are also caught.

    Deliberately simple for MVP scope: near-duplicate detection (slightly
    reworded headlines of the same story) is listed as a future-work
    enhancement, not attempted here.
    """
    basis = f"{source_url.strip().lower()}|{headline.strip().lower()}"
    return hashlib.sha256(basis.encode("utf-8")).hexdigest()

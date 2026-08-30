"""
Shared helper functions for the FinBERT proof-of-concept.

Kept separate from sentiment_poc.py so the formatting/classification logic
can be unit-tested without needing torch/transformers installed (see
test_finbert_utils.py).
"""

SAMPLE_HEADLINES = [
    "Apple shares surge after record iPhone sales beat analyst expectations",
    "Tech stocks tumble as inflation fears grip Wall Street",
    "The Federal Reserve held interest rates steady at its latest meeting",
    "Company X reports massive quarterly loss, shares plunge 20%",
    "Investors remain cautious ahead of tomorrow's jobs report",
    "Startup raises $50 million in Series B funding round led by top VC firm",
]


def classify(classifier, headline: str) -> dict:
    """Run one headline through a HuggingFace sentiment-analysis pipeline
    (or anything with the same call signature) and return a clean result.

    `classifier` is expected to behave like:
        classifier(text) -> [{"label": "positive", "score": 0.87}]
    which is exactly what `transformers.pipeline("sentiment-analysis", ...)`
    returns. This lets tests pass in a fake classifier instead of the real
    (slow, model-downloading) one.
    """
    if not headline or not headline.strip():
        raise ValueError("headline must be a non-empty string")

    raw_result = classifier(headline)[0]
    return {
        "headline": headline,
        "label": raw_result["label"],
        "confidence": round(raw_result["score"], 4),
    }


def format_result(result: dict) -> str:
    """Render a classify() result as a small human-readable block."""
    return (
        f"\n  Headline  : {result['headline']}\n"
        f"  Sentiment : {result['label'].upper()}\n"
        f"  Confidence: {result['confidence']:.1%}"
    )


def print_result(result: dict) -> None:
    print(format_result(result))

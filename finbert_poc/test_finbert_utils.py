"""
Lightweight tests for finbert_utils.py that do NOT require torch/transformers
to be installed. They stand in a fake classifier with the same call shape as
transformers.pipeline("sentiment-analysis", ...) to check the classify() and
formatting logic is correct before you point it at the real model.

Run:
    python test_finbert_utils.py
"""

from finbert_utils import classify, format_result


class FakeClassifier:
    """Mimics transformers.pipeline("sentiment-analysis", ...) output shape."""

    def __init__(self, label: str, score: float):
        self.label = label
        self.score = score

    def __call__(self, text):
        return [{"label": self.label, "score": self.score}]


def test_classify_returns_expected_fields():
    fake = FakeClassifier("positive", 0.9231)
    result = classify(fake, "Company X beats earnings expectations")
    assert result["headline"] == "Company X beats earnings expectations"
    assert result["label"] == "positive"
    assert result["confidence"] == 0.9231
    print("PASS: test_classify_returns_expected_fields")


def test_classify_rejects_empty_headline():
    fake = FakeClassifier("neutral", 0.5)
    try:
        classify(fake, "   ")
    except ValueError:
        print("PASS: test_classify_rejects_empty_headline")
        return
    raise AssertionError("expected ValueError for empty headline")


def test_format_result_contains_label_and_confidence():
    result = {"headline": "Stocks rally", "label": "positive", "confidence": 0.8123}
    text = format_result(result)
    assert "POSITIVE" in text
    assert "81.2%" in text
    print("PASS: test_format_result_contains_label_and_confidence")


if __name__ == "__main__":
    test_classify_returns_expected_fields()
    test_classify_rejects_empty_headline()
    test_format_result_contains_label_and_confidence()
    print("\nAll finbert_utils tests passed.")

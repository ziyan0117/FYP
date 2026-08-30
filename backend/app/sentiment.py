from functools import lru_cache

MODEL_NAME = "ProsusAI/finbert"


@lru_cache(maxsize=1)
def _get_classifier():
    # Imported lazily so importing this module doesn't require
    # torch/transformers unless you actually call classify().
    from transformers import pipeline
    return pipeline("sentiment-analysis", model=MODEL_NAME, tokenizer=MODEL_NAME, top_k=None)


def classify(text: str) -> dict:
    """
    Returns:
        {
          "label": "positive" | "neutral" | "negative",
          "confidence": float,      # the top label's own score
          "prob_positive": float,
          "prob_neutral": float,
          "prob_negative": float,
        }
    """
    if not text or not text.strip():
        raise ValueError("text must be non-empty")

    classifier = _get_classifier()
    scores = classifier(text)[0]  # top_k=None returns all classes for one input
    by_label = {item["label"].lower(): item["score"] for item in scores}
    top_label = max(by_label, key=by_label.get)

    return {
        "label": top_label,
        "confidence": round(by_label[top_label], 4),
        "prob_positive": round(by_label.get("positive", 0.0), 4),
        "prob_neutral": round(by_label.get("neutral", 0.0), 4),
        "prob_negative": round(by_label.get("negative", 0.0), 4),
    }

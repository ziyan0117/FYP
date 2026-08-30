"""
FYP Proof-of-Concept: financial headline -> FinBERT -> sentiment + confidence

Run:
    pip install -r requirements.txt
    python sentiment_poc.py

What this does:
    1. Loads the pretrained FinBERT model (ProsusAI/finbert) from Hugging Face.
    2. Runs a batch of sample financial headlines through it.
    3. Prints each headline's predicted label (positive / neutral / negative)
       and the model's confidence score.
    4. Lets you type your own headline interactively afterwards.

This is intentionally the smallest possible slice of the full pipeline
described in the FYP project plan (see "Data and NLP pipeline"): no news
API, no database, no preprocessing yet -- just headline in, sentiment out.
Everything else in the plan builds on top of this script.
"""

from transformers import pipeline

from finbert_utils import SAMPLE_HEADLINES, classify, print_result

MODEL_NAME = "ProsusAI/finbert"


def load_model():
    print(f"Loading {MODEL_NAME} ... (first run downloads ~440MB, then it's cached locally)")
    return pipeline("sentiment-analysis", model=MODEL_NAME, tokenizer=MODEL_NAME)


def main():
    classifier = load_model()

    print("\n=== Running on sample financial headlines ===")
    for headline in SAMPLE_HEADLINES:
        result = classify(classifier, headline)
        print_result(result)

    print("\n\n=== Try your own headline (press Enter on a blank line to quit) ===")
    while True:
        headline = input("\nHeadline: ").strip()
        if not headline:
            break
        result = classify(classifier, headline)
        print_result(result)


if __name__ == "__main__":
    main()

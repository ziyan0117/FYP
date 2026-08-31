# Step 1 — FinBERT headline sentiment proof-of-concept

Smallest possible slice of the pipeline: **a financial headline in, a
sentiment label + confidence score out.** No news API, no database, no
preprocessing yet — those come in later steps.

## Files

- `sentiment_poc.py` — main script. Loads FinBERT, runs it on 6 sample
  headlines, then lets you type your own.
- `finbert_utils.py` — the classification + formatting logic, kept separate
  so it can be tested without needing torch/transformers installed.
- `test_finbert_utils.py` — offline tests using a fake classifier, so you can
  sanity-check the logic before pointing it at the real (large, slow-to-load)
  model. Already run once — all 3 pass.
- `requirements.txt` — the packages you need.

## How to run

```bash
cd finbert_poc
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python sentiment_poc.py
```

The first run downloads the FinBERT model (~440MB) from Hugging Face and
caches it locally (`~/.cache/huggingface`) — subsequent runs are fast and
don't need internet access. If you don't have a machine with enough disk/RAM
handy, this also runs fine in a free **Google Colab** notebook: just `!pip
install transformers torch` in the first cell, paste the two `.py` files'
contents into cells (or upload them), and run.

## Expected output

```
Loading ProsusAI/finbert ... (first run downloads ~440MB, then it's cached locally)

=== Running on sample financial headlines ===

  Headline  : Apple shares surge after record iPhone sales beat analyst expectations
  Sentiment : POSITIVE
  Confidence: 97.8%

  Headline  : Tech stocks tumble as inflation fears grip Wall Street
  Sentiment : NEGATIVE
  Confidence: 96.4%

  Headline  : The Federal Reserve held interest rates steady at its latest meeting
  Sentiment : NEUTRAL
  Confidence: 88.1%
  ...

=== Try your own headline (press Enter on a blank line to quit) ===

Headline: Netflix subscriber growth disappoints investors
  Sentiment : NEGATIVE
  Confidence: ...
```

Exact confidence numbers will vary slightly by model version, but the
positive/negative/neutral headlines above should classify correctly — if a
clearly positive headline comes back negative (or vice versa), something is
wrong with the setup, not just borderline model behaviour.

## A note on where this was built

I couldn't actually execute the model download here — this session's cloud
sandbox has outbound network access locked down (pip and npm installs both
get blocked), so `pip install torch transformers` fails in this container.
What I *did* verify here: both scripts compile cleanly, and
`test_finbert_utils.py` passes — the classification/formatting logic itself
is correct. What's left to verify is the FinBERT call itself, which needs to
run somewhere with normal internet access (your own machine or Colab).

## Troubleshooting

- **`pip install` fails / times out**: check your own internet connection
  first; if you're on a restricted network (e.g. campus wifi with a proxy),
  try a personal hotspot or Colab instead.
- **`ModuleNotFoundError: No module named 'transformers'`**: the venv isn't
  activated, or `pip install -r requirements.txt` didn't finish — rerun it
  and watch for errors.
- **Very slow on first run**: expected — it's downloading the model. After
  that it loads from the local cache in a couple of seconds.
- **Wrong-looking predictions**: rerun `test_finbert_utils.py` first to rule
  out a bug in the surrounding code; if that passes, the issue is specific to
  the real model call — share the exact output and we'll debug it together.

---

# Step 2 — comparing FinBERT against VADER and TextBlob

Backs the "planned comparison baselines" described in the project report
(Chapter 6.2 / Chapter 7): actually runs FinBERT, VADER, and TextBlob against
the same small, manually labelled sample of financial headlines and scores
all three the same way.

## Files

- `compare_models.py` — main script. Loads all three models, classifies
  every headline in `labelled_headlines.py`, scores each model, prints a
  metrics table + confusion matrix + disagreement list per model, and writes
  `comparison_results.csv`.
- `labelled_headlines.py` — 20 hand-labelled headlines (positive/neutral/
  negative), including a few chosen specifically because they contain
  finance vocabulary ("tax", "liability", "vice") that general-purpose
  lexicons are known to misread — see the file's own docstring.
- `metrics.py` — pure-Python accuracy / confusion-matrix / precision-recall-
  F1 / score-bucketing logic, with no scikit-learn dependency, so it (and its
  tests) run without installing any of the three sentiment models.
- `test_metrics.py` — 9 offline tests for `metrics.py`, hand-checked against
  manually computed expected values. Already run in the cloud sandbox where
  this was written (all 9 pass) — installing FinBERT/VADER/TextBlob there is
  blocked by the same restricted network noted above, so `compare_models.py`
  itself (the part that needs those three libraries) is unverified until run
  on your machine.

## How to run

```bash
cd finbert_poc
pip install -r requirements.txt
python compare_models.py
```

This reuses the same FinBERT model as `sentiment_poc.py` (and the same one
the production `backend/app/sentiment.py` uses), so if you've already run
`sentiment_poc.py` once, the model is already cached and this will load fast.

## What to look at in the output

The per-model accuracy/macro-F1 numbers are a start, but the **disagreement
list** at the end is usually more useful for the report: it shows exactly
which headlines each model got wrong, including whether VADER/TextBlob
tripped on one of the finance-vocabulary "trap" headlines the way the
literature review predicts they would. `comparison_results.csv` has every
model's prediction for every headline, ready to drop into a table or chart
in the evaluation chapter.

## Verify the tests yourself

```bash
pip install pytest   # if you don't already have it
pytest test_metrics.py -v
```

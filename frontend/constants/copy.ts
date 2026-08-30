/**
 * Formulaic copy generators -- every sentence here is built from real
 * numbers the backend returned. The design mockup's equivalent lines
 * ("Chips are carrying the whole market today", "FinBERT read 'beats' and
 * 'record' as positive") are AI-written narrative tied to specific demo
 * headlines; the backend has no text-generation step, so the real app
 * reads plainer and says only what the numbers support.
 */
import { CompanySentiment, MarketSentiment } from './api';
import { formatDelta, sentimentLabel } from './finpulse-theme';

// Chapter 6.3-style confidence floor: below this, treat the read as Neutral
// rather than a weak Positive/Negative -- otherwise the app overstates what
// the model actually knows. See the design notes' "measure the label, not
// the vibe" production gap.
export const CONFIDENCE_FLOOR = 0.55;

export function effectiveLabel(label: string | null, confidence: number | null): string | null {
  if (label === null) return null;
  if (confidence !== null && confidence < CONFIDENCE_FLOOR) return 'neutral';
  return label;
}

export function confidenceWord(confidence: number): 'low' | 'moderate' | 'high' {
  if (confidence >= 0.7) return 'high';
  if (confidence >= CONFIDENCE_FLOOR) return 'moderate';
  return 'low';
}

/** Today digest's "so what" line -- built from the market score and
 * whichever watchlist ticker swung the most. */
export function marketTakeaway(
  market: MarketSentiment,
  watchlist: CompanySentiment[]
): string {
  if (market.article_count === 0) {
    return "No fresh coverage yet today — check back once the next ingestion run lands.";
  }
  const label = sentimentLabel(market.score);
  const positives = watchlist.filter((r) => sentimentLabel(r.score) === 'Positive').length;
  const withDelta = watchlist
    .filter((r) => r.score !== null && r.prev_score !== null)
    .map((r) => ({ ticker: r.ticker, delta: r.score! - r.prev_score! }));
  const biggest = withDelta.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];

  const overall = `The watchlist reads ${label.toLowerCase()} overall — ${positives} of ${watchlist.length} tickers positive.`;
  if (!biggest || Math.abs(biggest.delta) < 0.05) {
    return `${overall} Nothing swung much since the prior window.`;
  }
  return `${overall} ${biggest.ticker} moved the most, ${formatDelta(biggest.delta)} vs the prior window.`;
}

/** Article detail's "why we called it X" paragraph -- built from the real
 * split and confidence, not from words pulled out of the headline. */
export function whyExplanation(args: {
  label: string;
  confidence: number;
  probPositive: number;
  probNeutral: number;
  probNegative: number;
}): string {
  const { label, confidence, probPositive, probNeutral, probNegative } = args;
  const confPct = Math.round(confidence * 100);
  const word = confidenceWord(confidence);
  const dominantPct = Math.round(
    (label === 'positive' ? probPositive : label === 'negative' ? probNegative : probNeutral) * 100
  );
  return `FinBERT read this ${label} with ${confPct}% confidence (${word}) — ${dominantPct}% of the model's weight landed on ${label}, the rest split across the other two readings.`;
}

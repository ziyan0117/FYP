/**
 * FinPulse's design tokens -- ported from the Modernist design system's dark
 * remap (see the handoff bundle's _ds/modernist-<id>/styles.css, plus the
 * dark theme override applied on top of it). This app ships dark-only: the
 * design was iterated to a single dark theme, not a light/dark toggle, so
 * there is no light variant here.
 *
 * Flat, architectural, Archivo throughout, zero corner radius, strong 2px
 * dividers. Don't hand-pick a new color or px value outside this file --
 * everything on screen should trace back to one of these tokens.
 */

export const Colors = {
  bg: '#201e1d',
  surface: '#2d2b2b',
  text: '#f3f2f2', // ink -- primary text, and the "positive" fill everywhere
  divider: 'rgba(243,242,242,0.4)',

  neutral100: '#141312',
  neutral200: '#2d2b2b',
  neutral300: '#3a3737',
  neutral400: '#605d5d',
  neutral500: '#7d7979',
  neutral600: '#9b9797',
  neutral700: '#bab6b6',
  neutral800: '#d7d3d3',
  neutral900: '#f8f4f4',

  // True red -- reserved for solid fields: primary buttons, the "So what"
  // banner, negative bar/segment fills, the gauge needle.
  accent: '#ec3013',
  // Lighter salmon -- accent used as *text/label color* on the dark ground
  // (kickers, links, small caps). The design's accent-400 and its
  // dark-remapped accent-700 both resolve to this same value.
  accentText: '#ff9783',

  // The story stack's full-bleed panel is a step darker than the app
  // ground, not the same color -- keeps it reading as a distinct "mode".
  panelBg: '#0c0b0b',
  panelFg: '#f3f2f2',
} as const;

export const Fonts = {
  heading: 'Archivo_800ExtraBold', // var(--font-heading), weight 800 throughout
  body: 'Archivo_400Regular', // var(--font-body), weight 400
} as const;

export type SentimentLabel = 'Positive' | 'Negative' | 'Neutral' | 'No data';

/** aggregation.py's -1..+1 confidence-weighted scale -> the same three-way
 * split used everywhere in the UI. Mirrors the frontend's existing
 * thresholds (±0.15) from the pre-redesign screens. */
export function sentimentLabel(score: number | null): SentimentLabel {
  if (score === null) return 'No data';
  if (score > 0.15) return 'Positive';
  if (score < -0.15) return 'Negative';
  return 'Neutral';
}

/** The color a score's *number* and its polarity-bar fill render in --
 * never the sole carrier of meaning (the label word is always printed
 * alongside it too, per the design's colour-blind-safety note). */
export function sentimentColor(score: number | null): string {
  if (score === null) return Colors.neutral500;
  if (score > 0.15) return Colors.text;
  if (score < -0.15) return Colors.accent;
  return Colors.neutral700;
}

/** Maps the backend's lowercase label vocabulary ("positive"/"neutral"/
 * "negative", or null when nothing's been scored yet) onto the same
 * SentimentLabel used everywhere a score is displayed. */
export function labelFromBackend(label: string | null): SentimentLabel {
  if (label === 'positive') return 'Positive';
  if (label === 'negative') return 'Negative';
  if (label === 'neutral') return 'Neutral';
  return 'No data';
}

export function chipColors(label: SentimentLabel): {
  bg: string;
  fg: string;
  border: string;
} {
  switch (label) {
    case 'Positive':
      return { bg: Colors.text, fg: Colors.bg, border: Colors.text };
    case 'Negative':
      return { bg: Colors.accent, fg: Colors.text, border: Colors.accent };
    case 'No data':
      return { bg: 'transparent', fg: Colors.neutral600, border: Colors.neutral400 };
    case 'Neutral':
    default:
      return { bg: 'transparent', fg: Colors.neutral800, border: Colors.neutral500 };
  }
}

/** "+0.58" / "−0.44" / "—" -- a real minus sign, not a hyphen, to
 * match the design's typeset numbers. */
export function formatScore(score: number | null): string {
  if (score === null) return '—';
  const sign = score > 0 ? '+' : score < 0 ? '−' : '';
  return `${sign}${Math.abs(score).toFixed(2)}`;
}

export function formatDelta(delta: number | null): string {
  if (delta === null) return '—';
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  return `${sign}${Math.abs(delta).toFixed(2)}`;
}

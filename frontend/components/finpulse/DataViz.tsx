import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Colors, Fonts, sentimentColor } from '@/constants/finpulse-theme';
import { SentimentHistoryPoint } from '@/constants/api';

/**
 * The -1..+1 polarity bar used in list rows (Watchlist rows, Today's
 * watchlist-mood strip): a flat track with a center tick, filled from the
 * middle toward whichever side the score falls on. A null score renders as
 * an empty track -- "no news" reads as a gap, never a flat zero.
 */
export function PolarityBar({
  score,
  height = 12,
  style,
}: {
  score: number | null;
  height?: number;
  /** The bar fills 100% of its own width -- pass `{ flex: 1 }` when this
   * sits inline in a row next to other elements that should share the
   * remaining space (e.g. Today's watchlist strip); omit it when the
   * parent already stretches its column children to full width (e.g. a
   * Watchlist row's middle column). */
  style?: ViewStyle;
}) {
  const magnitude = score === null ? 0 : Math.min(1, Math.abs(score)) * 50;
  const left = score === null || score >= 0 ? 50 : 50 - magnitude;
  const color = sentimentColor(score);
  return (
    <View style={[styles.track, { height }, style]}>
      <View style={[styles.centerTick, { height: height + 6, top: -3 }]} />
      {score !== null && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            height,
            left: `${left}%`,
            width: `${magnitude}%`,
            backgroundColor: color,
          }}
        />
      )}
    </View>
  );
}

/**
 * The bigger -1..+1 gauge with end ticks and a needle, used for the
 * market-mood and company-mood headline numbers.
 */
export function Gauge({
  score,
  height = 34,
  labels = ['−1 bearish', '0', '+1 bullish'],
}: {
  score: number | null;
  height?: number;
  labels?: [string, string, string];
}) {
  const clamped = score === null ? 0 : Math.max(-1, Math.min(1, score));
  const needleLeft = 50 + clamped * 50;
  const fillLeft = clamped >= 0 ? 50 : needleLeft;
  const fillWidth = Math.abs(clamped) * 50;
  const midline = height * 0.42;
  const tickHeight = height * 0.65;

  return (
    <View>
      <View style={[styles.gaugeWrap, { height }]}>
        <View style={[styles.gaugeLine, { top: midline }]} />
        <View
          style={[
            styles.gaugeFill,
            { top: midline, left: `${fillLeft}%`, width: `${fillWidth}%` },
          ]}
        />
        <View style={[styles.gaugeZeroTick, { top: (height - tickHeight) / 2, height: tickHeight }]} />
        <View style={[styles.gaugeNeedle, { left: `${needleLeft}%`, height }]} />
        <View style={[styles.gaugeEndTick, { left: 0, top: (height - tickHeight) / 2, height: tickHeight }]} />
        <View
          style={[styles.gaugeEndTick, { right: 0, top: (height - tickHeight) / 2, height: tickHeight }]}
        />
      </View>
      <View style={styles.gaugeLabels}>
        <Text style={styles.gaugeLabelText}>{labels[0]}</Text>
        <Text style={styles.gaugeLabelText}>{labels[1]}</Text>
        <Text style={styles.gaugeLabelText}>{labels[2]}</Text>
      </View>
    </View>
  );
}

/**
 * The three-way FinBERT probability bar -- article detail's "why we called
 * it X" (with % labels baked in), company headline rows, and the story
 * stack (bare, with a legend printed separately).
 */
export function SplitBar({
  pos,
  neu,
  neg,
  height = 5,
  showLabels = false,
}: {
  pos: number;
  neu: number;
  neg: number;
  height?: number;
  showLabels?: boolean;
}) {
  return (
    <View style={[styles.splitRow, { height }]}>
      <View style={[styles.splitSeg, { flex: Math.max(pos, 0.0001), backgroundColor: Colors.text }]}>
        {showLabels && pos >= 10 && <Text style={[styles.splitLabel, { color: Colors.bg }]}>{Math.round(pos)}%</Text>}
      </View>
      <View style={[styles.splitSeg, { flex: Math.max(neu, 0.0001), backgroundColor: Colors.neutral400 }]}>
        {showLabels && neu >= 10 && (
          <Text style={[styles.splitLabel, { color: Colors.text }]}>{Math.round(neu)}%</Text>
        )}
      </View>
      <View style={{ flex: Math.max(neg, 0.0001), backgroundColor: Colors.accent }} />
    </View>
  );
}

/** Company detail's 14-day sentiment history, split above/below a zero
 * line -- a day with no articles draws as a dotted outline rather than a
 * misleading flat bar at zero. Each day is tappable: `onSelectDay` fires
 * with that day's point (score/article_count/date) so the caller can show
 * an annotated readout, and `selectedDate` (if passed back in) highlights
 * which column is currently selected. */
export function DayByDayChart({
  points,
  selectedDate,
  onSelectDay,
}: {
  points: SentimentHistoryPoint[];
  selectedDate?: string | null;
  onSelectDay?: (point: SentimentHistoryPoint) => void;
}) {
  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartZeroLine} />
      {points.map((p) => {
        const isSelected = p.date === selectedDate;
        const colStyle = [styles.chartCol, isSelected && styles.chartColSelected];
        if (p.score === null) {
          return (
            <Pressable key={p.date} onPress={() => onSelectDay?.(p)} style={colStyle}>
              <View style={styles.chartPosSlot}>
                <View style={styles.chartNoNews} />
              </View>
              <View style={styles.chartNegSlot} />
            </Pressable>
          );
        }
        const barHeight = Math.max(5, Math.min(1, Math.abs(p.score)) * 56);
        const positive = p.score >= 0;
        return (
          <Pressable key={p.date} onPress={() => onSelectDay?.(p)} style={colStyle}>
            <View style={styles.chartPosSlot}>
              {positive && <View style={{ width: '100%', height: barHeight, backgroundColor: Colors.text }} />}
            </View>
            <View style={styles.chartNegSlot}>
              {!positive && (
                <View style={{ width: '100%', height: barHeight, backgroundColor: Colors.accent }} />
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: Colors.neutral200,
    position: 'relative',
  },
  centerTick: {
    position: 'absolute',
    left: '50%',
    width: 1,
    backgroundColor: Colors.neutral400,
  },
  gaugeWrap: {
    position: 'relative',
  },
  gaugeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.neutral400,
  },
  gaugeFill: {
    position: 'absolute',
    height: 2,
    backgroundColor: Colors.text,
  },
  gaugeZeroTick: {
    position: 'absolute',
    left: '50%',
    width: 2,
    backgroundColor: Colors.neutral500,
  },
  gaugeNeedle: {
    position: 'absolute',
    top: 0,
    width: 4,
    backgroundColor: Colors.accent,
  },
  gaugeEndTick: {
    position: 'absolute',
    width: 2,
    backgroundColor: Colors.neutral400,
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  gaugeLabelText: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    letterSpacing: 1,
    color: Colors.neutral600,
    textTransform: 'uppercase',
  },
  splitRow: {
    flexDirection: 'row',
    width: '100%',
  },
  splitSeg: {
    justifyContent: 'center',
    paddingLeft: 8,
    overflow: 'hidden',
  },
  splitLabel: {
    fontFamily: Fonts.heading,
    fontSize: 12,
  },
  chartWrap: {
    height: 130,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    position: 'relative',
  },
  chartZeroLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 64,
    height: 1,
    backgroundColor: Colors.neutral400,
  },
  chartCol: {
    flex: 1,
    height: 130,
    flexDirection: 'column',
  },
  // Background tint only (no border) -- a border would eat into the
  // column's fixed 130px height and nudge its bars out of alignment with
  // its unselected neighbours.
  chartColSelected: {
    backgroundColor: 'rgba(243,242,242,0.12)',
  },
  chartPosSlot: {
    height: 64,
    justifyContent: 'flex-end',
  },
  chartNegSlot: {
    height: 66,
    justifyContent: 'flex-start',
  },
  chartNoNews: {
    width: '100%',
    height: 6,
    borderWidth: 2,
    borderStyle: 'dotted',
    borderColor: Colors.neutral400,
  },
});

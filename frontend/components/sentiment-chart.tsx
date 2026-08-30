import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { SentimentHistoryPoint } from '@/constants/api';

type Props = {
  data: SentimentHistoryPoint[];
  width?: number;
  height?: number;
};

const PADDING_X = 28;
const PADDING_Y = 20;
const LINE_COLOR = '#0a7ea4';

/**
 * A small, dependency-light line chart for a company's sentiment-over-time
 * series (FR-12). Built directly on react-native-svg rather than a full
 * charting library -- the plot logic here is under 40 lines, and avoiding a
 * heavier chart package sidesteps any New Architecture / Expo SDK 54
 * compatibility risk from a less actively maintained dependency.
 *
 * The vertical scale is always fixed to [-1, +1] -- that's the aggregation
 * formula's own scale (see aggregation.py), not derived from the data on
 * screen -- so a flat line near the top always means "strongly positive"
 * whichever company or time range you're looking at, rather than the axis
 * silently rescaling itself per company.
 *
 * Days with no articles carry score=null from the API and are treated as
 * gaps: they're skipped when drawing the connecting line rather than being
 * plotted as a false "neutral" (0) point.
 */
export function SentimentChart({ data, width = 320, height = 160 }: Props) {
  const plotW = width - PADDING_X * 2;
  const plotH = height - PADDING_Y * 2;

  const scoreToY = (score: number) => PADDING_Y + ((1 - score) / 2) * plotH;
  const indexToX = (i: number) =>
    PADDING_X + (data.length <= 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);

  const known = data
    .map((point, i) =>
      point.score !== null ? { x: indexToX(i), y: scoreToY(point.score), point } : null
    )
    .filter((p): p is { x: number; y: number; point: SentimentHistoryPoint } => p !== null);

  if (known.length === 0) {
    return (
      <View style={[styles.emptyState, { width, height }]}>
        <ThemedText style={styles.emptyText}>
          Not enough history yet to draw a timeline.
        </ThemedText>
      </View>
    );
  }

  const polylinePoints = known.map((p) => `${p.x},${p.y}`).join(' ');
  const firstDate = data[0]?.date;
  const lastDate = data[data.length - 1]?.date;

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Neutral (score = 0) reference line */}
        <Line
          x1={PADDING_X}
          y1={scoreToY(0)}
          x2={width - PADDING_X}
          y2={scoreToY(0)}
          stroke="#88888855"
          strokeWidth={1}
          strokeDasharray="4,4"
        />

        {known.length > 1 && (
          <Polyline points={polylinePoints} fill="none" stroke={LINE_COLOR} strokeWidth={2} />
        )}

        {known.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={LINE_COLOR} />
        ))}

        <SvgText x={4} y={PADDING_Y - 6} fontSize={10} fill="#888888">
          +1
        </SvgText>
        <SvgText x={4} y={height - PADDING_Y + 14} fontSize={10} fill="#888888">
          -1
        </SvgText>
      </Svg>
      {firstDate && lastDate && (
        <View style={styles.dateRow}>
          <ThemedText style={styles.dateLabel}>{firstDate}</ThemedText>
          <ThemedText style={styles.dateLabel}>{lastDate}</ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: PADDING_X - 4,
    marginTop: -4,
  },
  dateLabel: {
    fontSize: 10,
    opacity: 0.6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    opacity: 0.6,
  },
});

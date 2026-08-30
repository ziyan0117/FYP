import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export const DAY_OPTIONS = [
  { days: 1, label: 'Today' },
  { days: 3, label: '3d' },
  { days: 7, label: '1w' },
  { days: 14, label: '2w' },
  { days: 30, label: '1m' },
  { days: 90, label: '3m' },
  { days: 365, label: '1y' },
] as const;

type Props = {
  value: number;
  onChange: (days: number) => void;
};

/**
 * A horizontally scrollable row of pill buttons for picking a look-back
 * window, from "Today" up to a year. Shared by the Watchlist, Trending, and
 * company detail screens so all three filter consistently -- one small
 * component instead of screen-specific ones that could drift apart.
 *
 * Scrollable rather than a fixed row: 7 options (Today/3d/1w/2w/1m/3m/1y)
 * don't reliably fit on a narrow phone screen at a comfortable tap size, so
 * this scrolls horizontally instead of shrinking/wrapping.
 */
export function DaysFilter({ value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {DAY_OPTIONS.map(({ days, label }) => {
        const selected = days === value;
        return (
          <Pressable
            key={days}
            onPress={() => onChange(days)}
            style={[styles.pill, selected && styles.pillSelected]}>
            <ThemedText style={[styles.pillText, selected && styles.pillTextSelected]}>
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
    paddingRight: 4,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#88888866',
  },
  pillSelected: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  pillText: {
    fontSize: 13,
    opacity: 0.7,
  },
  pillTextSelected: {
    opacity: 1,
    color: 'white',
    fontWeight: '600',
  },
});

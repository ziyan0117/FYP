import { StyleSheet, Text, View } from 'react-native';

import { chipColors, Fonts, SentimentLabel } from '@/constants/finpulse-theme';

/** The sentiment label chip: solid ink fill for Positive, solid red for
 * Negative, outlined for Neutral, dotted-feeling grey outline for "No
 * data". Colour never carries meaning alone -- the word is always in the
 * chip too. */
export function Chip({ label, size = 'default' }: { label: SentimentLabel; size?: 'default' | 'small' }) {
  const c = chipColors(label);
  return (
    <View
      style={[
        styles.base,
        size === 'small' && styles.small,
        { backgroundColor: c.bg, borderColor: c.border },
      ]}>
      <Text style={[styles.text, size === 'small' && styles.textSmall, { color: c.fg }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  small: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  text: {
    fontFamily: Fonts.heading,
    fontSize: 9,
    letterSpacing: 1,
  },
  textSmall: {
    fontSize: 9,
  },
});

/** A plain uppercase label in the sentiment colour, no border/fill -- used
 * where the chip would be too heavy (e.g. inline next to a mover's "why"
 * line). */
export function SentimentWord({ label, color }: { label: SentimentLabel; color: string }) {
  return <Text style={[styles.text, { color, letterSpacing: 1.2 }]}>{label.toUpperCase()}</Text>;
}

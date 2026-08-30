import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/finpulse-theme';

const SEGMENTS: { label: string; days: number }[] = [
  { label: '24h', days: 1 },
  { label: '3d', days: 3 },
  { label: '1w', days: 7 },
  { label: '2w', days: 14 },
  { label: '1m', days: 30 },
];

/** Five equal segments, replacing the pre-redesign scrolling pill row --
 * per the design notes, a fixed control reads faster and every option is
 * always visible. */
export function DayFilter({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  return (
    <View style={styles.row}>
      {SEGMENTS.map((seg, i) => {
        const active = seg.days === value;
        return (
          <Pressable
            key={seg.label}
            onPress={() => onChange(seg.days)}
            style={[styles.seg, i < SEGMENTS.length - 1 && styles.segDivider, active && styles.segActive]}>
            <Text style={[styles.segText, active && styles.segTextActive]}>{seg.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: Colors.divider,
  },
  seg: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segDivider: {
    borderRightWidth: 1,
    borderRightColor: Colors.neutral300,
  },
  segActive: {
    backgroundColor: Colors.text,
  },
  segText: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: Colors.neutral700,
  },
  segTextActive: {
    color: Colors.bg,
  },
});

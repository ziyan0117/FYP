import { Pressable, StyleSheet } from 'react-native';

import { Colors } from '@/constants/finpulse-theme';

/** Bare icon-tap-target used for header back/close buttons -- 44px+ hit
 * area via hitSlop even though the visual icon is small, per the design's
 * "everything tappable is 44px+" rule. */
export function IconButton({
  onPress,
  children,
  bordered = false,
}: {
  onPress: () => void;
  children: React.ReactNode;
  bordered?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.base, bordered && styles.bordered, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    padding: 8,
    margin: -8,
  },
  bordered: {
    margin: 0,
    borderWidth: 2,
    borderColor: Colors.text,
  },
  pressed: {
    opacity: 0.6,
  },
});

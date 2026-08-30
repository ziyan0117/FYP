import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/finpulse-theme';

type Variant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  variant?: Variant;
  disabled?: boolean;
};

/** The design's block CTA: label flush left, trailing icon flush right,
 * never centered -- "a button wider than its label starts the text at the
 * left padding edge" per the Modernist guide. */
export function Button({ label, onPress, icon, variant = 'primary', disabled }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text
        style={[
          styles.label,
          variant === 'primary' && styles.labelPrimary,
          variant === 'ghost' && styles.labelGhost,
        ]}
        numberOfLines={1}>
        {label}
      </Text>
      {icon ? <View>{icon}</View> : null}
    </Pressable>
  );
}

/** The small-caps text-only link used for "All 10 →", "Edit", "All →". */
export function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => pressed && styles.pressedGhost}>
      <Text style={styles.linkLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  primary: {
    backgroundColor: Colors.accent,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.divider,
  },
  ghost: {
    backgroundColor: 'transparent',
    minHeight: undefined,
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.75,
  },
  pressedGhost: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    color: Colors.text,
  },
  labelPrimary: {
    color: Colors.text,
  },
  labelGhost: {
    fontSize: 13,
    color: Colors.text,
  },
  linkLabel: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.accentText,
  },
});

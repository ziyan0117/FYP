import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowRightIcon } from '@/components/finpulse/icons';
import { Colors, Fonts } from '@/constants/finpulse-theme';
import { INTERESTS } from '@/constants/interests';
import { useAppState } from '@/contexts/app-state';

export default function OnboardingInterestsScreen() {
  const { interests: savedInterests, setInterests } = useAppState();
  const [picked, setPicked] = useState<string[]>(savedInterests);

  function toggle(name: string) {
    setPicked((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  }

  function continue_() {
    setInterests(picked);
    router.push('/onboarding/tickers');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.step}>STEP 1 OF 2</Text>
        <Text style={styles.h1}>What do you{'\n'}actually care about?</Text>
        <Text style={styles.sub}>
          Pick three or more. We use these to decide which headlines are worth your morning.
        </Text>
        <View style={styles.hr} />
        <View style={styles.chipWrap}>
          {INTERESTS.map((name) => {
            const on = picked.includes(name);
            return (
              <Pressable
                key={name}
                onPress={() => toggle(name)}
                style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
                <Text style={[styles.chipText, { color: on ? Colors.bg : Colors.text }]}>{name}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.hr} />
        <Text style={styles.count}>{picked.length} selected</Text>
        <Pressable onPress={continue_} style={styles.cta}>
          <Text style={styles.ctaText}>Continue</Text>
          <ArrowRightIcon color={Colors.text} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  step: {
    fontFamily: Fonts.heading,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: Colors.accentText,
  },
  h1: {
    fontFamily: Fonts.heading,
    fontSize: 40,
    color: Colors.text,
    letterSpacing: -0.8,
    marginTop: 14,
    marginBottom: 10,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.neutral700,
    maxWidth: 300,
    marginBottom: 20,
    lineHeight: 20,
  },
  hr: { height: 2, backgroundColor: Colors.divider, marginBottom: 20 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 2, justifyContent: 'center' },
  chipOn: { backgroundColor: Colors.text, borderColor: Colors.text },
  chipOff: { backgroundColor: 'transparent', borderColor: Colors.divider },
  chipText: { fontFamily: Fonts.heading, fontSize: 13 },
  footer: { paddingHorizontal: 20, paddingBottom: 8, gap: 10 },
  count: { fontFamily: Fonts.body, fontSize: 12, color: Colors.neutral700 },
  cta: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaText: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.text },
});

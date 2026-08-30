import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TickerPicker } from '@/components/finpulse/TickerPicker';
import { Colors, Fonts } from '@/constants/finpulse-theme';
import { useAppState } from '@/contexts/app-state';

export default function OnboardingTickersScreen() {
  const { tickers: savedTickers, completeOnboarding, interests } = useAppState();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.step}>STEP 2 OF 2</Text>
        <Text style={styles.h1}>Now pick{'\n'}your tickers.</Text>
        <Text style={styles.sub}>
          Ten names are pre-loaded. Untick anything you&apos;d rather not hear about.
        </Text>
      </View>
      <TickerPicker
        initialPicked={savedTickers}
        ctaLabel="Build my digest"
        onSubmit={(picks) => {
          completeOnboarding(interests, picks);
          router.replace('/(tabs)');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 16 },
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
  sub: { fontFamily: Fonts.body, fontSize: 14, color: Colors.neutral700, marginBottom: 16 },
});

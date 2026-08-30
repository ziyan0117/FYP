import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowLeftIcon } from '@/components/finpulse/icons';
import { IconButton } from '@/components/finpulse/IconButton';
import { TickerPicker } from '@/components/finpulse/TickerPicker';
import { Colors, Fonts } from '@/constants/finpulse-theme';
import { useAppState } from '@/contexts/app-state';

/** The Watchlist screen's "Edit" entry point -- same ticker checklist as
 * onboarding step 2, reachable any time (unlike the onboarding route
 * itself, which is only mounted while hasOnboarded is false). */
export default function EditTickersScreen() {
  const { tickers, setTickers } = useAppState();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton onPress={() => router.back()}>
          <ArrowLeftIcon color={Colors.text} />
        </IconButton>
        <Text style={styles.title}>Edit tickers</Text>
      </View>
      <TickerPicker
        initialPicked={tickers}
        ctaLabel="Save"
        onSubmit={(picks) => {
          setTickers(picks);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.divider,
  },
  title: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.text },
});

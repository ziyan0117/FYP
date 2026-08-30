import { Archivo_400Regular, Archivo_800ExtraBold, useFonts } from '@expo-google-fonts/archivo';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { Colors } from '@/constants/finpulse-theme';
import { AppStateProvider, useAppState } from '@/contexts/app-state';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => {});

// FinPulse ships dark-only (the design was iterated to one dark theme, not
// a light/dark toggle) -- reusing React Navigation's DarkTheme as the base
// and overriding its palette with FinPulse's own tokens.
const NAV_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.bg,
    card: Colors.bg,
    text: Colors.text,
    border: Colors.neutral300,
    primary: Colors.accent,
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Archivo_400Regular, Archivo_800ExtraBold });

  return (
    <AppStateProvider>
      <Gate fontsLoaded={fontsLoaded} />
    </AppStateProvider>
  );
}

function Gate({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { loaded: stateLoaded, hasOnboarded } = useAppState();
  const ready = fontsLoaded && stateLoaded;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider value={NAV_THEME}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
        <Stack.Protected guard={hasOnboarded}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!hasOnboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Screen name="company/[ticker]" options={{ presentation: 'card' }} />
        <Stack.Screen name="article/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="edit-tickers" options={{ presentation: 'card' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

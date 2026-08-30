import { Stack } from 'expo-router';

import { Colors } from '@/constants/finpulse-theme';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
      <Stack.Screen name="interests" />
      <Stack.Screen name="tickers" />
    </Stack>
  );
}

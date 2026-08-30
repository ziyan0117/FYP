import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  TabListIcon,
  TabPulseIcon,
  TabTodayIcon,
  TabTrendingIcon,
  TabYouIcon,
} from '@/components/finpulse/icons';
import { Colors, Fonts } from '@/constants/finpulse-theme';

const ICONS: Record<string, (color: string) => React.ReactNode> = {
  index: (c) => <TabTodayIcon color={c} />,
  watchlist: (c) => <TabListIcon color={c} />,
  trending: (c) => <TabTrendingIcon color={c} />,
  story: (c) => <TabPulseIcon color={c} />,
  profile: (c) => <TabYouIcon color={c} />,
};

const LABELS: Record<string, string> = {
  index: 'Today',
  watchlist: 'List',
  trending: 'Trending',
  story: 'Pulse',
  profile: 'You',
};

/** Five equal-width flat tabs, closest to the existing Expo app's nav shape
 * (design variant 1a) -- everything one tap away, no digest-only bottom
 * bar. */
function FinPulseTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const active = state.index === index;
        const color = active ? Colors.bg : Colors.neutral700;
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (!active) navigation.navigate(route.name);
            }}
            style={[
              styles.tab,
              index < state.routes.length - 1 && styles.tabDivider,
              { backgroundColor: active ? Colors.text : Colors.bg },
            ]}>
            {ICONS[route.name]?.(color)}
            <Text style={[styles.label, { color }]}>{LABELS[route.name] ?? route.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <FinPulseTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="watchlist" />
      <Tabs.Screen name="trending" />
      <Tabs.Screen name="story" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: Colors.text,
    backgroundColor: Colors.bg,
  },
  tab: {
    flex: 1,
    minHeight: 56,
    paddingTop: 9,
    alignItems: 'center',
    gap: 4,
  },
  tabDivider: {
    borderRightWidth: 1,
    borderRightColor: Colors.neutral300,
  },
  label: {
    fontFamily: Fonts.heading,
    fontSize: 9,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
});

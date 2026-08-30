import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';

import { DaysFilter } from '@/components/days-filter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CompanySentiment, getCompanies, getCompanySentiment } from '@/constants/api';

function sentimentColor(score: number | null): string {
  if (score === null) return '#888888';
  if (score > 0.15) return '#2e7d32'; // positive - green
  if (score < -0.15) return '#c62828'; // negative - red
  return '#f9a825'; // roughly neutral - amber
}

function sentimentLabel(score: number | null): string {
  if (score === null) return 'No data';
  if (score > 0.15) return 'Positive';
  if (score < -0.15) return 'Negative';
  return 'Neutral';
}

export default function HomeScreen() {
  const [days, setDays] = useState(7);
  const [items, setItems] = useState<CompanySentiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (selectedDays: number) => {
    setError(null);
    try {
      const companies = await getCompanies();
      // Fetch every company's sentiment in parallel rather than one at a
      // time -- with a 10-company watchlist this is 10 quick requests
      // firing together instead of a slow sequential chain.
      const results = await Promise.all(
        companies.map((c) => getCompanySentiment(c.ticker, selectedDays))
      );
      setItems(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // Initial load only -- day-range changes are handled by handleDaysChange
  // below, which shows the lighter pull-to-refresh spinner instead of
  // re-showing the full-screen loading state every time the filter changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    load(days).finally(() => setLoading(false));
  }, []);

  const handleDaysChange = useCallback(
    (newDays: number) => {
      setDays(newDays);
      setRefreshing(true);
      load(newDays).finally(() => setRefreshing(false));
    },
    [load]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(days);
    setRefreshing(false);
  }, [load, days]);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
        <ThemedText>Loading watchlist...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>
        Watchlist
      </ThemedText>
      <DaysFilter value={days} onChange={handleDaysChange} />

      {error && <ThemedText style={styles.error}>⚠️ {error}</ThemedText>}

      <FlatList
        data={items}
        keyExtractor={(item) => item.ticker}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          // Carry the currently-selected day range along to the company
          // detail screen (as a string route param -- expo-router params are
          // always strings) so tapping into a company shows the same window
          // you were just looking at on the Watchlist, instead of resetting
          // to the detail screen's own default.
          <Link
            href={{
              pathname: '/company/[ticker]',
              params: { ticker: item.ticker, days: String(days) },
            }}
            asChild>
            <Pressable>
              <ThemedView style={styles.card}>
                <ThemedView style={styles.cardRow}>
                  <ThemedText type="defaultSemiBold">{item.ticker}</ThemedText>
                  <ThemedView
                    style={[styles.badge, { backgroundColor: sentimentColor(item.score) }]}>
                    <ThemedText style={styles.badgeText}>{sentimentLabel(item.score)}</ThemedText>
                  </ThemedView>
                </ThemedView>
                <ThemedText>{item.name}</ThemedText>
                <ThemedText style={styles.meta}>
                  {item.score !== null ? `Score: ${item.score.toFixed(2)}` : 'Score: —'} ·{' '}
                  {item.article_count} article{item.article_count === 1 ? '' : 's'}
                </ThemedText>
              </ThemedView>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          <ThemedText style={styles.meta}>No companies in the watchlist yet.</ThemedText>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  header: {
    marginBottom: 12,
  },
  list: {
    paddingTop: 12,
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#88888844',
    gap: 4,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    opacity: 0.7,
  },
  error: {
    color: '#c62828',
    marginBottom: 8,
  },
});

import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CompanySentiment, getCompanySentiment, getTrending, TrendingCompany } from '@/constants/api';

function sentimentColor(score: number | null): string {
  if (score === null) return '#888888';
  if (score > 0.15) return '#2e7d32';
  if (score < -0.15) return '#c62828';
  return '#f9a825';
}

function sentimentLabel(score: number | null): string {
  if (score === null) return 'No data';
  if (score > 0.15) return 'Positive';
  if (score < -0.15) return 'Negative';
  return 'Neutral';
}

type TrendingRow = TrendingCompany & { score: number | null };

export default function TrendingScreen() {
  const [items, setItems] = useState<TrendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      // Backend already ranks by recent article volume -- ask for enough
      // rows to cover the whole watchlist rather than its default top-5.
      const trending = await getTrending(10);
      const sentiments = await Promise.all(
        trending.map((t) => getCompanySentiment(t.ticker).catch<CompanySentiment>(() => ({
          ticker: t.ticker,
          name: t.name,
          score: null,
          article_count: t.article_count,
        })))
      );
      const merged: TrendingRow[] = trending.map((t, i) => ({ ...t, score: sentiments[i].score }));
      setItems(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
        <ThemedText>Loading trending companies...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>
        Trending
      </ThemedText>
      <ThemedText style={styles.meta}>Ranked by recent news volume</ThemedText>

      {error && <ThemedText style={styles.error}>⚠️ {error}</ThemedText>}

      <FlatList
        data={items}
        keyExtractor={(item) => item.ticker}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <Link href={{ pathname: '/company/[ticker]', params: { ticker: item.ticker } }} asChild>
            <Pressable>
              <ThemedView style={styles.card}>
                <ThemedText style={styles.rank}>#{index + 1}</ThemedText>
                <ThemedView style={styles.cardBody}>
                  <ThemedView style={styles.cardRow}>
                    <ThemedText type="defaultSemiBold">
                      {item.ticker} · {item.name}
                    </ThemedText>
                    <ThemedView
                      style={[styles.badge, { backgroundColor: sentimentColor(item.score) }]}>
                      <ThemedText style={styles.badgeText}>
                        {sentimentLabel(item.score)}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                  <ThemedText style={styles.meta}>
                    {item.article_count} article{item.article_count === 1 ? '' : 's'} in the last
                    few days
                  </ThemedText>
                </ThemedView>
              </ThemedView>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          <ThemedText style={styles.meta}>No trending data yet — run the ingestion pipeline.</ThemedText>
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
    marginBottom: 2,
  },
  list: {
    paddingTop: 12,
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#88888844',
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  rank: {
    fontSize: 18,
    fontWeight: '700',
    opacity: 0.4,
    minWidth: 32,
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

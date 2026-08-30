import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

import { SentimentChart } from '@/components/sentiment-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Article,
  CompanySentiment,
  SentimentHistoryPoint,
  getCompanyNews,
  getCompanySentiment,
  getCompanySentimentHistory,
} from '@/constants/api';

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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function CompanyDetailScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();

  const { width } = useWindowDimensions();
  const [sentiment, setSentiment] = useState<CompanySentiment | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [history, setHistory] = useState<SentimentHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ticker) return;
    setError(null);
    try {
      const [sentimentResult, newsResult, historyResult] = await Promise.all([
        getCompanySentiment(ticker),
        getCompanyNews(ticker),
        getCompanySentimentHistory(ticker, 14),
      ]);
      setSentiment(sentimentResult);
      setArticles(newsResult);
      setHistory(historyResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [ticker]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: ticker ?? 'Company' }} />

      {loading ? (
        <ThemedView style={styles.centered}>
          <ActivityIndicator size="large" />
          <ThemedText>Loading {ticker}...</ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <ThemedView style={styles.headerBlock}>
              <ThemedText type="title">{sentiment?.name ?? ticker}</ThemedText>
              {error && <ThemedText style={styles.error}>⚠️ {error}</ThemedText>}
              {sentiment && (
                <ThemedView style={styles.scoreRow}>
                  <ThemedView
                    style={[styles.badge, { backgroundColor: sentimentColor(sentiment.score) }]}>
                    <ThemedText style={styles.badgeText}>
                      {sentimentLabel(sentiment.score)}
                    </ThemedText>
                  </ThemedView>
                  <ThemedText style={styles.meta}>
                    {sentiment.score !== null ? `Score: ${sentiment.score.toFixed(2)}` : 'Score: —'}{' '}
                    · {sentiment.article_count} article{sentiment.article_count === 1 ? '' : 's'}
                  </ThemedText>
                </ThemedView>
              )}
              <ThemedText type="subtitle" style={styles.chartHeading}>
                Last 14 days
              </ThemedText>
              <SentimentChart data={history} width={width - 32} />
              <ThemedText type="subtitle" style={styles.newsHeading}>
                Recent headlines
              </ThemedText>
            </ThemedView>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => WebBrowser.openBrowserAsync(item.source_url)}>
              <ThemedView style={styles.card}>
                <ThemedText type="defaultSemiBold" numberOfLines={2}>
                  {item.headline}
                </ThemedText>
                <ThemedText style={styles.meta} numberOfLines={2}>
                  {item.snippet}
                </ThemedText>
                <ThemedView style={styles.cardFooter}>
                  <ThemedText style={styles.meta}>
                    {item.source} · {formatDate(item.published_at)}
                  </ThemedText>
                  {item.label && (
                    <ThemedView
                      style={[
                        styles.badgeSmall,
                        { backgroundColor: sentimentColor(item.label === 'positive' ? 1 : item.label === 'negative' ? -1 : 0) },
                      ]}>
                      <ThemedText style={styles.badgeText}>{item.label}</ThemedText>
                    </ThemedView>
                  )}
                </ThemedView>
              </ThemedView>
            </Pressable>
          )}
          ListEmptyComponent={
            <ThemedText style={styles.meta}>No articles ingested for {ticker} yet.</ThemedText>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  headerBlock: {
    gap: 8,
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartHeading: {
    marginTop: 4,
  },
  newsHeading: {
    marginTop: 12,
  },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#88888844',
    gap: 6,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
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
  },
});

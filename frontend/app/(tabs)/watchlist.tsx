import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PolarityBar } from '@/components/finpulse/DataViz';
import { LinkButton } from '@/components/finpulse/Button';
import { DayFilter } from '@/components/finpulse/DayFilter';
import { CompanySentiment, getCompanies, getCompanySentiment } from '@/constants/api';
import { Colors, Fonts, formatScore, sentimentColor, sentimentLabel } from '@/constants/finpulse-theme';
import { useAppState } from '@/contexts/app-state';

export default function WatchlistScreen() {
  const { tickers, defaultDays } = useAppState();
  const [days, setDays] = useState(defaultDays);
  const [rows, setRows] = useState<CompanySentiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (selectedDays: number) => {
      const companies = await getCompanies();
      const picked = tickers ? companies.filter((c) => tickers.includes(c.ticker)) : companies;
      const results = await Promise.all(
        picked.map((c) =>
          getCompanySentiment(c.ticker, selectedDays).catch<CompanySentiment>(() => ({
            ticker: c.ticker,
            name: c.name,
            score: null,
            article_count: 0,
            prev_score: null,
          }))
        )
      );
      setRows(results);
    },
    [tickers]
  );

  useEffect(() => {
    setLoading(true);
    load(days).finally(() => setLoading(false));
  }, [days, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(days);
    setRefreshing(false);
  }, [days, load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.h2}>Watchlist</Text>
        <LinkButton label="Edit" onPress={() => router.push('/edit-tickers')} />
      </View>
      <DayFilter value={days} onChange={setDays} />
      <View style={styles.colHeader}>
        <Text style={styles.colHeaderText}>TICKER</Text>
        <Text style={styles.colHeaderText}>MOOD · ARTICLES</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.text} />
        </View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.text} />}>
          {rows.map((r) => {
            const label = sentimentLabel(r.score);
            const color = sentimentColor(r.score);
            return (
              <Pressable key={r.ticker} onPress={() => router.push(`/company/${r.ticker}`)} style={styles.row}>
                <View style={styles.tickerCol}>
                  <Text style={styles.ticker}>{r.ticker}</Text>
                  <Text style={styles.name} numberOfLines={1}>
                    {r.name}
                  </Text>
                </View>
                <View style={styles.midCol}>
                  <PolarityBar score={r.score} height={14} />
                  <View style={styles.labelRow}>
                    <Text style={[styles.label, { color }]}>{label.toUpperCase()}</Text>
                    <Text style={styles.count}>
                      {r.article_count === 0
                        ? 'no news'
                        : `${r.article_count} article${r.article_count === 1 ? '' : 's'}`}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.score, { color }]}>{formatScore(r.score)}</Text>
              </Pressable>
            );
          })}
          {rows.length === 0 && (
            <Text style={styles.empty}>No companies in the watchlist yet.</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: Colors.divider,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  h2: { fontFamily: Fonts.heading, fontSize: 30, color: Colors.text, letterSpacing: -0.5 },
  colHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral300,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colHeaderText: { fontFamily: Fonts.heading, fontSize: 9, letterSpacing: 1, color: Colors.neutral600 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 15,
    minHeight: 74,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral300,
  },
  tickerCol: { width: 74, gap: 2 },
  ticker: { fontFamily: Fonts.heading, fontSize: 17, color: Colors.text },
  name: { fontFamily: Fonts.body, fontSize: 11, color: Colors.neutral600 },
  midCol: { flex: 1, gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: Fonts.heading, fontSize: 9, letterSpacing: 1 },
  count: { fontFamily: Fonts.body, fontSize: 11, color: Colors.neutral600 },
  score: { fontFamily: Fonts.heading, fontSize: 16, width: 48, textAlign: 'right' },
  empty: { fontFamily: Fonts.body, fontSize: 13, color: Colors.neutral700, padding: 20 },
});

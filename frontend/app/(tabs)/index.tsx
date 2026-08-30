import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertIcon } from '@/components/finpulse/icons';
import { Gauge, PolarityBar } from '@/components/finpulse/DataViz';
import { LinkButton, Button } from '@/components/finpulse/Button';
import {
  CompanySentiment,
  MarketSentiment,
  getCompanies,
  getCompanyNews,
  getCompanySentiment,
  getMarketSentiment,
} from '@/constants/api';
import { marketTakeaway } from '@/constants/copy';
import { Colors, Fonts, formatDelta, formatScore, sentimentLabel } from '@/constants/finpulse-theme';
import { useAppState } from '@/contexts/app-state';

type Mover = { ticker: string; delta: number; why: string };

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function TodayScreen() {
  const { tickers } = useAppState();
  const [days, setDays] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [market, setMarket] = useState<MarketSentiment | null>(null);
  const [rows, setRows] = useState<(CompanySentiment & { articleTotal: number })[]>([]);
  const [movers, setMovers] = useState<Mover[]>([]);

  const load = useCallback(
    async (selectedDays: number) => {
      const [marketResult, companies] = await Promise.all([getMarketSentiment(selectedDays), getCompanies()]);
      const picked = tickers ? companies.filter((c) => tickers.includes(c.ticker)) : companies;
      const sentiments = await Promise.all(
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
      setMarket(marketResult);
      setRows(sentiments.map((s) => ({ ...s, articleTotal: s.article_count })));

      const withDelta = sentiments
        .filter((s) => s.score !== null && s.prev_score !== null)
        .map((s) => ({ ticker: s.ticker, delta: s.score! - s.prev_score! }))
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 3);
      const withWhy = await Promise.all(
        withDelta.map(async (m) => {
          const headlines = await getCompanyNews(m.ticker, 1, selectedDays).catch(() => []);
          return { ...m, why: headlines[0]?.headline ?? 'New coverage since the last window' };
        })
      );
      setMovers(withWhy);
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

  const totalArticles = rows.reduce((sum, r) => sum + r.articleTotal, 0);
  const isEmpty = !loading && totalArticles === 0 && days === 1;

  if (loading) return <TodaySkeleton />;

  if (isEmpty) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>FINPULSE</Text>
          <Text style={styles.date}>{todayLabel().toUpperCase()}</Text>
        </View>
        <View style={styles.emptyBody}>
          <View style={styles.emptyIconBox}>
            <AlertIcon />
          </View>
          <Text style={styles.emptyTitle}>Nothing to read yet.</Text>
          <Text style={styles.emptyCopy}>
            No articles have come through for your tickers in the last 24 hours. That&apos;s usually a
            quiet weekend, not a bug.
          </Text>
          <View style={styles.hr} />
          <Button label="Widen to 7 days" onPress={() => setDays(7)} />
        </View>
      </SafeAreaView>
    );
  }

  const marketLabel = sentimentLabel(market?.score ?? null);
  const moodPhrase =
    marketLabel === 'Positive' ? 'Leaning up' : marketLabel === 'Negative' ? 'Leaning down' : 'Holding flat';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.text} />}>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>FINPULSE</Text>
          <Text style={styles.date}>{todayLabel().toUpperCase()}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.kicker}>MARKET MOOD · LAST 24H</Text>
          <View style={styles.moodRow}>
            <Text style={styles.moodScore}>{formatScore(market?.score ?? null)}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.moodPhrase}>{moodPhrase.toUpperCase()}</Text>
              <Text style={styles.moodMeta}>
                {market?.article_count ?? 0} articles · {market?.company_count ?? 0} tickers
              </Text>
            </View>
          </View>
          <Gauge score={market?.score ?? null} />
        </View>

        <View style={styles.soWhat}>
          <Text style={styles.soWhatKicker}>SO WHAT</Text>
          <Text style={styles.soWhatText}>{market ? marketTakeaway(market, rows) : ''}</Text>
        </View>

        {movers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.kicker}>BIGGEST SWINGS VS YESTERDAY</Text>
            {movers.map((m) => {
              const deltaColor = m.delta >= 0 ? Colors.text : Colors.accent;
              return (
                <Pressable
                  key={m.ticker}
                  onPress={() => router.push(`/company/${m.ticker}`)}
                  style={styles.moverRow}>
                  <Text style={styles.moverTicker}>{m.ticker}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.moverWhy} numberOfLines={2}>
                      {m.why}
                    </Text>
                  </View>
                  <Text style={[styles.moverDelta, { color: deltaColor }]}>{formatDelta(m.delta)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.kicker}>YOUR WATCHLIST MOOD</Text>
            <LinkButton label={`All ${rows.length} →`} onPress={() => router.push('/watchlist')} />
          </View>
          {rows.slice(0, 5).map((r) => (
            <Pressable key={r.ticker} onPress={() => router.push(`/company/${r.ticker}`)} style={styles.stripRow}>
              <Text style={styles.stripTicker}>{r.ticker}</Text>
              <PolarityBar score={r.score} style={{ flex: 1 }} />
              <Text style={[styles.stripScore, { color: r.score !== null ? undefined : Colors.neutral500 }]}>
                {formatScore(r.score)}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={{ height: 26 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function skelBlock(extra: ViewStyle) {
  return [{ backgroundColor: Colors.neutral300 }, extra];
}

function TodaySkeleton() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.brand}>FINPULSE</Text>
        <Text style={[styles.date, { color: Colors.accentText }]}>SCORING…</Text>
      </View>
      <View style={styles.section}>
        <View style={skelBlock({ width: 120, height: 11, marginBottom: 16 })} />
        <View style={skelBlock({ width: 190, height: 52, marginBottom: 18 })} />
        <View style={{ height: 12, backgroundColor: Colors.neutral200 }}>
          <View style={{ width: '38%', height: 12, backgroundColor: Colors.neutral400 }} />
        </View>
      </View>
      <View style={[styles.section, { backgroundColor: Colors.neutral200 }]}>
        <View style={skelBlock({ width: 90, height: 9, marginBottom: 12 })} />
        <View style={skelBlock({ width: '100%', height: 20, marginBottom: 7 })} />
        <View style={skelBlock({ width: '72%', height: 20 })} />
      </View>
      <View style={styles.section}>
        <View style={skelBlock({ width: 150, height: 9, marginBottom: 18 })} />
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.skelRow}>
            <View style={skelBlock({ width: 52, height: 16 })} />
            <View style={[skelBlock({ height: 12 }), { flex: 1 }]} />
            <View style={skelBlock({ width: 40, height: 16 })} />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.text, letterSpacing: -0.2 },
  date: { fontFamily: Fonts.body, fontSize: 11, color: Colors.neutral600, letterSpacing: 0.8 },
  section: { padding: 20, borderBottomWidth: 2, borderBottomColor: Colors.divider },
  kicker: { fontFamily: Fonts.heading, fontSize: 10, letterSpacing: 1.4, color: Colors.neutral600, marginBottom: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  moodRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 },
  moodScore: { fontFamily: Fonts.heading, fontSize: 68, lineHeight: 68, color: Colors.text, letterSpacing: -2 },
  moodPhrase: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.text, textTransform: 'uppercase', letterSpacing: 0.6 },
  moodMeta: { fontFamily: Fonts.body, fontSize: 11, color: Colors.neutral700, marginTop: 2 },
  soWhat: { padding: 20, borderBottomWidth: 2, borderBottomColor: Colors.divider, backgroundColor: Colors.accent },
  soWhatKicker: { fontFamily: Fonts.heading, fontSize: 10, letterSpacing: 1.4, color: 'rgba(243,242,242,0.75)', marginBottom: 8 },
  soWhatText: { fontFamily: Fonts.heading, fontSize: 22, lineHeight: 27, color: Colors.text, letterSpacing: -0.3 },
  moverRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, minHeight: 58, borderTopWidth: 1, borderTopColor: Colors.neutral300 },
  moverTicker: { fontFamily: Fonts.heading, fontSize: 17, width: 58, color: Colors.text },
  moverWhy: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 17, color: Colors.neutral800 },
  moverDelta: { fontFamily: Fonts.heading, fontSize: 19 },
  stripRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, minHeight: 46, borderTopWidth: 1, borderTopColor: Colors.neutral300 },
  stripTicker: { fontFamily: Fonts.heading, fontSize: 14, width: 58, color: Colors.text },
  stripScore: { fontFamily: Fonts.heading, fontSize: 12, width: 44, textAlign: 'right', color: Colors.text },
  emptyBody: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  emptyIconBox: { width: 46, height: 46, borderWidth: 3, borderColor: Colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 30, color: Colors.text, marginBottom: 12 },
  emptyCopy: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 22, color: Colors.neutral800, maxWidth: 300, marginBottom: 20 },
  hr: { height: 2, backgroundColor: Colors.divider, marginBottom: 16 },
  skelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: Colors.neutral300 },
});

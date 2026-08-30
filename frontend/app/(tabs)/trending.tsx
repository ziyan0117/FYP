import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/finpulse/Chip';
import { CompanySentiment, getCompanySentiment, getTopics, getTrending, Topic, TrendingCompany } from '@/constants/api';
import { Colors, Fonts, sentimentColor, sentimentLabel } from '@/constants/finpulse-theme';

const DAYS = 7;

type VolRow = TrendingCompany & { score: number | null };

export default function TrendingScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [volRows, setVolRows] = useState<VolRow[]>([]);

  const load = useCallback(async () => {
    const [topicList, trending] = await Promise.all([getTopics(5, DAYS), getTrending(6, DAYS)]);
    setTopics(topicList);
    const sentiments = await Promise.all(
      trending.map((t) =>
        getCompanySentiment(t.ticker, DAYS).catch<CompanySentiment>(() => ({
          ticker: t.ticker,
          name: t.name,
          score: null,
          article_count: t.article_count,
          prev_score: null,
          prev_article_count: 0,
        }))
      )
    );
    setVolRows(trending.map((t, i) => ({ ...t, score: sentiments[i].score })));
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const maxTopicVol = Math.max(1, ...topics.map((t) => t.article_count));
  const maxTickerVol = Math.max(1, ...volRows.map((v) => v.article_count));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.h2}>Trending</Text>
        <Text style={styles.sub}>What the news is loudest about, last {DAYS} days</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.text} />
        </View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.text} />}>
          <Text style={styles.sectionKicker}>TOPICS</Text>
          {topics.length === 0 && (
            <Text style={styles.emptyNote}>Not enough shared coverage yet to cluster a topic.</Text>
          )}
          {topics.map((t, i) => (
            <Pressable
              key={t.label}
              onPress={() => t.tickers[0] && router.push(`/company/${t.tickers[0]}`)}
              style={styles.topicRow}>
              <Text style={styles.rank}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={styles.topicTitle}>{t.label}</Text>
                <Text style={styles.meta}>
                  {t.tickers.join(', ')} · {t.article_count} article{t.article_count === 1 ? '' : 's'}
                </Text>
                <View style={styles.volTrack}>
                  <View style={[styles.volFill, { width: `${(t.article_count / maxTopicVol) * 100}%` }]} />
                </View>
              </View>
              <Chip label={sentimentLabel(t.score)} size="small" />
            </Pressable>
          ))}

          <View style={styles.hr} />
          <Text style={styles.sectionKicker}>TICKERS BY NEWS VOLUME</Text>
          {volRows.map((v, i) => (
            <Pressable key={v.ticker} onPress={() => router.push(`/company/${v.ticker}`)} style={styles.volRow}>
              <Text style={styles.rankSmall}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={styles.volTicker}>{v.ticker}</Text>
              <View style={styles.volRowTrack}>
                <View
                  style={[
                    styles.volRowFill,
                    { width: `${(v.article_count / maxTickerVol) * 100}%`, backgroundColor: sentimentColor(v.score) },
                  ]}
                />
              </View>
              <Text style={styles.volCount}>
                {v.article_count} art{v.article_count === 1 ? '.' : 's'}
              </Text>
            </Pressable>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: Colors.divider },
  h2: { fontFamily: Fonts.heading, fontSize: 30, color: Colors.text, letterSpacing: -0.5, marginBottom: 4 },
  sub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.neutral700 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionKicker: { fontFamily: Fonts.heading, fontSize: 10, letterSpacing: 1.4, color: Colors.neutral600, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  emptyNote: { fontFamily: Fonts.body, fontSize: 12, color: Colors.neutral700, paddingHorizontal: 20, paddingBottom: 12 },
  topicRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingVertical: 15, minHeight: 76, borderTopWidth: 1, borderTopColor: Colors.neutral300 },
  rank: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.neutral500, width: 26 },
  topicTitle: { fontFamily: Fonts.heading, fontSize: 17, lineHeight: 20, color: Colors.text, letterSpacing: -0.2 },
  meta: { fontFamily: Fonts.body, fontSize: 11, color: Colors.neutral600 },
  volTrack: { height: 6, backgroundColor: Colors.neutral200, marginTop: 2 },
  volFill: { height: 6, backgroundColor: Colors.text },
  hr: { height: 2, backgroundColor: Colors.divider, marginTop: 6 },
  volRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 13, minHeight: 56, borderTopWidth: 1, borderTopColor: Colors.neutral300 },
  rankSmall: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.neutral500, width: 26 },
  volTicker: { fontFamily: Fonts.heading, fontSize: 15, width: 62, color: Colors.text },
  volRowTrack: { flex: 1, height: 10, backgroundColor: Colors.neutral200 },
  volRowFill: { height: 10 },
  volCount: { fontFamily: Fonts.body, fontSize: 11, color: Colors.neutral700, width: 58, textAlign: 'right' },
});

import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/finpulse/Chip';
import { DayByDayChart, Gauge, SplitBar } from '@/components/finpulse/DataViz';
import { ArrowLeftIcon } from '@/components/finpulse/icons';
import { IconButton } from '@/components/finpulse/IconButton';
import {
  Article,
  CompanySentiment,
  SentimentHistoryPoint,
  getCompanyNews,
  getCompanySentiment,
  getCompanySentimentHistory,
} from '@/constants/api';
import { effectiveLabel } from '@/constants/copy';
import { Colors, Fonts, formatDelta, formatScore, labelFromBackend, sentimentLabel } from '@/constants/finpulse-theme';
import { useAppState } from '@/contexts/app-state';

const DAYS = 7;
const HISTORY_DAYS = 14;

export default function CompanyDetailScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const { tickers, setTickers } = useAppState();
  const [sentiment, setSentiment] = useState<CompanySentiment | null>(null);
  const [history, setHistory] = useState<SentimentHistoryPoint[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ticker) return;
    const [sentimentResult, historyResult, newsResult] = await Promise.all([
      getCompanySentiment(ticker, DAYS),
      getCompanySentimentHistory(ticker, HISTORY_DAYS),
      // Fetch across the whole chart window (not just DAYS) and generously
      // above the chart's typical volume, so tapping any of the 14 bars --
      // not just the last 7 days -- has real headlines to show underneath.
      getCompanyNews(ticker, 60, HISTORY_DAYS),
    ]);
    setSentiment(sentimentResult);
    setHistory(historyResult);
    setArticles(newsResult);
  }, [ticker]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const saved = !tickers || tickers.includes(ticker ?? '');
  const toggleSaved = () => {
    if (!ticker) return;
    const base = tickers ?? [];
    setTickers(saved ? base.filter((t) => t !== ticker) : [...base, ticker]);
  };

  const label = sentimentLabel(sentiment?.score ?? null);
  const delta =
    sentiment?.score !== null && sentiment?.score !== undefined && sentiment?.prev_score !== null && sentiment?.prev_score !== undefined
      ? sentiment.score - sentiment.prev_score
      : null;
  const oldestDate = history[0]?.date;
  const newestDate = history[history.length - 1]?.date;
  const gapDays = history.filter((p) => p.score === null).map((p) => p.date.slice(5));
  // Default the tapped-day readout to the most recent day whenever a fresh
  // history comes in (new ticker, or a pull-to-refresh) -- keeps something
  // useful showing without requiring a tap first, and resets cleanly
  // instead of pointing at a date that no longer exists in the new data.
  useEffect(() => {
    setSelectedDate(newestDate ?? null);
  }, [newestDate]);
  const selectedPoint = history.find((p) => p.date === selectedDate) ?? null;
  // `published_at` is a UTC datetime string and `history[].date` is bucketed
  // by UTC calendar day (compute_daily_sentiment_series) -- comparing their
  // date portions directly is correct without any timezone conversion.
  const dayArticles = useMemo(
    () => (selectedDate ? articles.filter((a) => a.published_at.slice(0, 10) === selectedDate) : []),
    [articles, selectedDate]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton onPress={() => router.back()}>
          <ArrowLeftIcon color={Colors.text} />
        </IconButton>
        <Text style={styles.headerTitle}>
          {ticker} · {sentiment?.name ?? ''}
        </Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={toggleSaved} style={styles.savedBtn}>
          <Text style={styles.savedText}>{saved ? 'SAVED' : 'SAVE'}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.text} />
        </View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.text} />}>
          <View style={styles.section}>
            <Text style={styles.kicker}>MOOD · LAST {DAYS} DAYS</Text>
            <View style={styles.moodRow}>
              <Text style={styles.moodScore}>{formatScore(sentiment?.score ?? null)}</Text>
              <View style={{ paddingBottom: 6 }}>
                <Text style={styles.moodPhrase}>{label.toUpperCase()}</Text>
                <Text style={styles.moodMeta}>
                  {sentiment?.article_count ?? 0} article{sentiment?.article_count === 1 ? '' : 's'}
                  {delta !== null ? ` · ${formatDelta(delta)} vs last window` : ''}
                </Text>
              </View>
            </View>
            <Gauge score={sentiment?.score ?? null} height={26} labels={['−1', '0', '+1']} />
          </View>

          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.kicker}>DAY BY DAY</Text>
              <Text style={styles.metaSmall}>{HISTORY_DAYS} days</Text>
            </View>
            {selectedPoint && (
              <View style={styles.selectedDayRow}>
                <Text style={styles.selectedDayDate}>{formatFull(selectedPoint.date)}</Text>
                <Text style={styles.selectedDayValue}>
                  {selectedPoint.score !== null
                    ? `${formatScore(selectedPoint.score)} · ${selectedPoint.article_count} article${selectedPoint.article_count === 1 ? '' : 's'}`
                    : 'No news that day'}
                </Text>
              </View>
            )}
            <DayByDayChart points={history} selectedDate={selectedDate} onSelectDay={(p) => setSelectedDate(p.date)} />
            <View style={styles.rowBetween}>
              <Text style={styles.axisLabel}>{oldestDate ? formatShort(oldestDate) : ''}</Text>
              {gapDays.length > 0 && (
                <Text style={styles.axisLabel}>no news {gapDays.join(', ')}</Text>
              )}
              <Text style={styles.axisLabel}>{newestDate ? formatShort(newestDate) : ''}</Text>
            </View>
            <Text style={styles.tapHint}>Tap a day for its number and headlines</Text>
          </View>

          <Text style={styles.headlinesKicker}>
            HEADLINES{selectedDate ? ` · ${formatFull(selectedDate).toUpperCase()}` : ''}
          </Text>
          {dayArticles.map((a) => {
            const eff = effectiveLabel(a.label, a.confidence);
            return (
              <Pressable key={a.id} onPress={() => router.push(`/article/${a.id}`)} style={styles.articleRow}>
                <View style={styles.articleTop}>
                  <Chip label={labelFromBackend(eff)} size="small" />
                  <Text style={styles.articleMeta}>
                    {a.source} · {formatTime(a.published_at)}
                  </Text>
                </View>
                <Text style={styles.headline}>{a.headline}</Text>
                {a.prob_positive !== null && a.prob_neutral !== null && a.prob_negative !== null && (
                  <SplitBar pos={a.prob_positive * 100} neu={a.prob_neutral * 100} neg={a.prob_negative * 100} height={5} />
                )}
              </Pressable>
            );
          })}
          {dayArticles.length === 0 && (
            <Text style={styles.emptyNote}>
              {articles.length === 0
                ? `No articles ingested for ${ticker} yet.`
                : `No headlines for ${selectedDate ? formatFull(selectedDate) : 'this day'} -- tap another day, or one further back.`}
            </Text>
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// `history[].date` is a bare "YYYY-MM-DD" calendar date (no time/zone --
// see compute_daily_sentiment_series). `new Date("2026-08-24")` parses
// date-only strings as UTC midnight per spec, so formatting it back with
// the *local* timezone can silently roll it back a day west of UTC.
// Building the Date from its parts instead (the local-time constructor)
// keeps it the same calendar day everywhere.
function parseDateOnly(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatShort(iso: string): string {
  try {
    return parseDateOnly(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

function formatFull(iso: string): string {
  try {
    return parseDateOnly(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
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
  headerTitle: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.text },
  savedBtn: { borderWidth: 2, borderColor: Colors.text, paddingHorizontal: 9, paddingVertical: 7, minHeight: 36, justifyContent: 'center' },
  savedText: { fontFamily: Fonts.heading, fontSize: 10, letterSpacing: 0.8, color: Colors.text },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { padding: 20, borderBottomWidth: 2, borderBottomColor: Colors.divider },
  kicker: { fontFamily: Fonts.heading, fontSize: 10, letterSpacing: 1.4, color: Colors.neutral600, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  moodRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginBottom: 6 },
  moodScore: { fontFamily: Fonts.heading, fontSize: 56, lineHeight: 56, color: Colors.text, letterSpacing: -1.6 },
  moodPhrase: { fontFamily: Fonts.heading, fontSize: 14, color: Colors.text, textTransform: 'uppercase', letterSpacing: 0.6 },
  moodMeta: { fontFamily: Fonts.body, fontSize: 11, color: Colors.neutral700, marginTop: 2 },
  metaSmall: { fontFamily: Fonts.body, fontSize: 11, color: Colors.neutral600 },
  axisLabel: { fontFamily: Fonts.body, fontSize: 10, color: Colors.neutral600, marginTop: 6 },
  selectedDayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  selectedDayDate: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.text },
  selectedDayValue: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.accentText },
  tapHint: { fontFamily: Fonts.body, fontSize: 10, color: Colors.neutral600, marginTop: 10 },
  headlinesKicker: { fontFamily: Fonts.heading, fontSize: 10, letterSpacing: 1.4, color: Colors.neutral600, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  articleRow: { gap: 8, paddingHorizontal: 20, paddingVertical: 15, borderTopWidth: 1, borderTopColor: Colors.neutral300 },
  articleTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  articleMeta: { fontFamily: Fonts.body, fontSize: 10, color: Colors.neutral600, textTransform: 'uppercase', letterSpacing: 0.5 },
  headline: { fontFamily: Fonts.heading, fontSize: 16, lineHeight: 20, color: Colors.text, letterSpacing: -0.2 },
  emptyNote: { fontFamily: Fonts.body, fontSize: 13, color: Colors.neutral700, padding: 20 },
});

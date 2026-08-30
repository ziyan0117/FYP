import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SplitBar } from '@/components/finpulse/DataViz';
import { ArrowLeftIcon, BookmarkIcon } from '@/components/finpulse/icons';
import { IconButton } from '@/components/finpulse/IconButton';
import { GlossaryEntry, GlossarySheet } from '@/components/finpulse/GlossarySheet';
import { JargonText } from '@/components/finpulse/JargonText';
import { Article, getArticle } from '@/constants/api';
import { confidenceWord, effectiveLabel, whyExplanation } from '@/constants/copy';
import { Colors, Fonts, labelFromBackend } from '@/constants/finpulse-theme';
import { GLOSSARY } from '@/constants/glossary';
import { useAppState } from '@/contexts/app-state';

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { toggles } = useAppState();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetEntry, setSheetEntry] = useState<GlossaryEntry | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getArticle(Number(id))
      .then((a) => !cancelled && setArticle(a))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading || !article) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.text} />
        </View>
      </SafeAreaView>
    );
  }

  const eff = effectiveLabel(article.label, article.confidence);
  const chipLabel = labelFromBackend(eff);
  const hasProbs =
    article.prob_positive !== null && article.prob_neutral !== null && article.prob_negative !== null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <IconButton onPress={() => router.back()}>
          <ArrowLeftIcon color={Colors.text} />
        </IconButton>
        <Text style={styles.headerTitle}>
          {article.source} · {formatTime(article.published_at)}
        </Text>
        <View style={{ flex: 1 }} />
        <IconButton onPress={() => {}}>
          <BookmarkIcon color={Colors.text} />
        </IconButton>
      </View>

      <ScrollView>
        <View style={styles.section}>
          <View style={styles.chipRow}>
            <View style={styles.mainChip}>
              <Text style={styles.mainChipText}>{chipLabel.toUpperCase()}</Text>
            </View>
            {article.tickers.map((t) => (
              <Pressable key={t} onPress={() => router.push(`/company/${t}`)} style={styles.tickerChip}>
                <Text style={styles.tickerChipText}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <JargonText
            text={article.headline}
            enabled={toggles.beginner}
            onTermPress={(k) => setSheetEntry(GLOSSARY[k])}
            style={styles.headline}
          />
          {!!article.snippet && (
            <JargonText
              text={article.snippet}
              enabled={toggles.beginner}
              onTermPress={(k) => setSheetEntry(GLOSSARY[k])}
              style={styles.snippet}
            />
          )}
        </View>

        {hasProbs && eff && (
          <View style={styles.section}>
            <Text style={styles.kicker}>WHY WE CALLED IT {eff.toUpperCase()}</Text>
            <SplitBar
              pos={article.prob_positive! * 100}
              neu={article.prob_neutral! * 100}
              neg={article.prob_negative! * 100}
              height={36}
              showLabels
            />
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.swatch, { backgroundColor: Colors.text }]} />
                <Text style={styles.legendText}>Positive</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.swatch, { backgroundColor: Colors.neutral400 }]} />
                <Text style={[styles.legendText, { color: Colors.neutral700 }]}>Neutral</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.swatch, { backgroundColor: Colors.accent }]} />
                <Text style={[styles.legendText, { color: Colors.accentText }]}>
                  Negative {Math.round(article.prob_negative! * 100)}%
                </Text>
              </View>
            </View>
            <View style={styles.hr} />
            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceLabel}>Model confidence</Text>
              <Text style={styles.confidenceValue}>
                {Math.round(article.confidence! * 100)}% · {confidenceWord(article.confidence!)}
              </Text>
            </View>
            <Text style={styles.explanation}>
              {whyExplanation({
                label: eff,
                confidence: article.confidence!,
                probPositive: article.prob_positive!,
                probNeutral: article.prob_neutral!,
                probNegative: article.prob_negative!,
              })}
            </Text>
          </View>
        )}

        <Pressable onPress={() => WebBrowser.openBrowserAsync(article.source_url)} style={styles.sourceLink}>
          <Text style={styles.sourceLinkText}>Read the full article at {article.source} →</Text>
        </Pressable>
        <View style={{ height: 24 }} />
      </ScrollView>

      <GlossarySheet entry={sheetEntry} onClose={() => setSheetEntry(null)} />
    </SafeAreaView>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' });
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
  headerTitle: { fontFamily: Fonts.heading, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: Colors.text },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { padding: 20, borderBottomWidth: 2, borderBottomColor: Colors.divider },
  chipRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  mainChip: { paddingHorizontal: 7, paddingVertical: 4, backgroundColor: Colors.text },
  mainChipText: { fontFamily: Fonts.heading, fontSize: 9, letterSpacing: 1, color: Colors.bg },
  tickerChip: { paddingHorizontal: 7, paddingVertical: 4, borderWidth: 2, borderColor: Colors.divider },
  tickerChipText: { fontFamily: Fonts.heading, fontSize: 9, letterSpacing: 1, color: Colors.text },
  headline: { fontFamily: Fonts.heading, fontSize: 27, lineHeight: 31, color: Colors.text, letterSpacing: -0.5, marginBottom: 12 },
  snippet: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 22, color: Colors.neutral800 },
  kicker: { fontFamily: Fonts.heading, fontSize: 10, letterSpacing: 1.4, color: Colors.neutral600, marginBottom: 12 },
  legendRow: { flexDirection: 'row', gap: 14, marginTop: 10, marginBottom: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 9, height: 9 },
  legendText: { fontFamily: Fonts.heading, fontSize: 9, letterSpacing: 1, color: Colors.text },
  hr: { height: 2, backgroundColor: Colors.neutral300, marginBottom: 14 },
  confidenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  confidenceLabel: { fontFamily: Fonts.body, fontSize: 13, color: Colors.neutral700 },
  confidenceValue: { fontFamily: Fonts.heading, fontSize: 17, color: Colors.text },
  explanation: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 21, color: Colors.neutral800 },
  sourceLink: { paddingHorizontal: 20, paddingVertical: 18 },
  sourceLinkText: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.accentText },
});

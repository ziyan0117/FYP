import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SplitBar } from '@/components/finpulse/DataViz';
import { ArrowDownIcon, ArrowRightIcon, CloseIcon } from '@/components/finpulse/icons';
import { Article, getCompanies, getCompanyNews } from '@/constants/api';
import { effectiveLabel } from '@/constants/copy';
import { Colors, Fonts, formatScore, labelFromBackend } from '@/constants/finpulse-theme';
import { useAppState } from '@/contexts/app-state';

const DAYS = 7;

type StoryArticle = Article & { ticker: string };

export default function StoryScreen() {
  const { tickers, incrementStoriesRead } = useAppState();
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<StoryArticle[]>([]);
  const listRef = useRef<FlatList<StoryArticle>>(null);
  const seenRef = useRef<Set<number>>(new Set());

  const load = useCallback(async () => {
    const companies = await getCompanies();
    const picked = tickers ? companies.filter((c) => tickers.includes(c.ticker)) : companies;
    const pools = await Promise.all(
      picked.map((c) =>
        getCompanyNews(c.ticker, 2, DAYS)
          .then((articles) => articles.map((a) => ({ ...a, ticker: c.ticker })))
          .catch(() => [] as StoryArticle[])
      )
    );
    const flat = pools
      .flat()
      .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
      .slice(0, 12);
    setStories(flat);
  }, [tickers]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first && typeof first.index === 'number' && !seenRef.current.has(first.index)) {
      seenRef.current.add(first.index);
      incrementStoriesRead();
    }
  });

  // The Tabs navigator already subtracts the custom tab bar's height from
  // this screen's content area -- measuring our own container (rather than
  // assuming Dimensions.get('window').height) is what keeps each story
  // card's height in sync with the space actually available, so paging and
  // the footer buttons land inside the viewport instead of under the tab
  // bar. Declared above the early returns below -- every hook here must run
  // on every render, loading/empty states included.
  const [cardHeight, setCardHeight] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => setCardHeight(e.nativeEvent.layout.height), []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.panelFg} />
        </View>
      </SafeAreaView>
    );
  }

  if (stories.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No recent stories to swipe through yet.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container} onLayout={onLayout}>
      {cardHeight > 0 && (
        <FlatList
          ref={listRef}
          data={stories}
          keyExtractor={(a) => String(a.id)}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          getItemLayout={(_, i) => ({ length: cardHeight, offset: cardHeight * i, index: i })}
          renderItem={({ item, index: i }) => (
            <StoryCard
              article={item}
              position={i}
              total={stories.length}
              height={cardHeight}
              onNext={() => listRef.current?.scrollToIndex({ index: Math.min(i + 1, stories.length - 1) })}
            />
          )}
        />
      )}
    </View>
  );
}

function StoryCard({
  article,
  position,
  total,
  height,
  onNext,
}: {
  article: StoryArticle;
  position: number;
  total: number;
  height: number;
  onNext: () => void;
}) {
  const eff = effectiveLabel(article.label, article.confidence);
  const chipLabel = labelFromBackend(eff);
  const hasProbs = article.prob_positive !== null && article.prob_neutral !== null && article.prob_negative !== null;
  const chipColors =
    chipLabel === 'Positive'
      ? { bg: Colors.panelFg, fg: Colors.panelBg }
      : chipLabel === 'Negative'
        ? { bg: Colors.accent, fg: Colors.panelFg }
        : { bg: 'rgba(243,242,242,0.25)', fg: Colors.panelFg };

  return (
    <SafeAreaView style={[styles.card, { height }]} edges={['top', 'bottom']}>
      <View style={styles.ticks}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[styles.tick, { backgroundColor: i <= position ? Colors.panelFg : 'rgba(243,242,242,0.28)' }]} />
        ))}
      </View>
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>
          PULSE · {position + 1} OF {total}
        </Text>
        <Pressable onPress={() => router.navigate('/')} hitSlop={10}>
          <CloseIcon color={Colors.panelFg} />
        </Pressable>
      </View>
      <View style={styles.body}>
        <View style={styles.chipRow}>
          <View style={[styles.chip, { backgroundColor: chipColors.bg }]}>
            <Text style={[styles.chipText, { color: chipColors.fg }]}>{chipLabel.toUpperCase()}</Text>
          </View>
          <View style={styles.tickerChip}>
            <Text style={styles.tickerChipText}>{article.ticker}</Text>
          </View>
        </View>
        <Text style={styles.headline} numberOfLines={5}>
          {article.headline}
        </Text>
        <View style={styles.hr} />
        <View style={styles.scoreRow}>
          <Text style={styles.scoreKicker}>SENTIMENT</Text>
          {article.confidence !== null && (
            <Text style={styles.scoreValue}>
              {formatScore(
                article.confidence !== null && eff === 'positive'
                  ? article.confidence
                  : eff === 'negative'
                    ? -article.confidence
                    : 0
              )}
            </Text>
          )}
        </View>
        {hasProbs && (
          <>
            <SplitBar pos={article.prob_positive! * 100} neu={article.prob_neutral! * 100} neg={article.prob_negative! * 100} height={22} />
            <View style={styles.rowBetween}>
              <Text style={styles.footNote}>{article.source}</Text>
              <Text style={styles.footNote}>
                {Math.round(article.prob_positive! * 100)} / {Math.round(article.prob_neutral! * 100)} /{' '}
                {Math.round(article.prob_negative! * 100)}
              </Text>
            </View>
          </>
        )}
        <View style={{ flex: 1 }} />
        <View style={styles.footerRow}>
          <Pressable onPress={() => router.push(`/article/${article.id}`)} style={styles.fullReadBtn}>
            <Text style={styles.fullReadText}>Full read</Text>
            <ArrowRightIcon size={16} color={Colors.panelFg} />
          </Pressable>
          <Pressable onPress={onNext} style={styles.nextBtn}>
            <ArrowDownIcon color={Colors.panelFg} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.panelBg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.neutral400, textAlign: 'center' },
  card: { backgroundColor: Colors.panelBg },
  headerRow: { paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLabel: { fontFamily: Fonts.heading, fontSize: 11, letterSpacing: 1, color: 'rgba(243,242,242,0.6)' },
  ticks: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, paddingTop: 12 },
  tick: { flex: 1, height: 3 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 26 },
  chipRow: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  chip: { paddingHorizontal: 7, paddingVertical: 4 },
  chipText: { fontFamily: Fonts.heading, fontSize: 9, letterSpacing: 1 },
  tickerChip: { paddingHorizontal: 7, paddingVertical: 4, borderWidth: 2, borderColor: 'rgba(243,242,242,0.35)' },
  tickerChipText: { fontFamily: Fonts.heading, fontSize: 9, letterSpacing: 1, color: 'rgba(243,242,242,0.8)' },
  headline: { fontFamily: Fonts.heading, fontSize: 34, lineHeight: 38, color: Colors.panelFg, letterSpacing: -0.8, marginBottom: 18 },
  hr: { height: 2, backgroundColor: 'rgba(243,242,242,0.25)', marginBottom: 16 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 },
  scoreKicker: { fontFamily: Fonts.heading, fontSize: 10, letterSpacing: 1.2, color: 'rgba(243,242,242,0.6)' },
  scoreValue: { fontFamily: Fonts.heading, fontSize: 30, color: Colors.panelFg, letterSpacing: -0.6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  footNote: { fontFamily: Fonts.body, fontSize: 10, color: 'rgba(243,242,242,0.55)' },
  footerRow: { flexDirection: 'row', gap: 10, paddingBottom: 16 },
  fullReadBtn: { flex: 1, minHeight: 50, paddingHorizontal: 14, backgroundColor: Colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fullReadText: { fontFamily: Fonts.heading, fontSize: 13, color: Colors.panelFg },
  nextBtn: { width: 56, minHeight: 50, borderWidth: 2, borderColor: 'rgba(243,242,242,0.4)', alignItems: 'center', justifyContent: 'center' },
});

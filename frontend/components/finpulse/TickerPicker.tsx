import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ArrowRightIcon, CheckIcon, SearchIcon } from '@/components/finpulse/icons';
import { Colors, Fonts } from '@/constants/finpulse-theme';
import { Company, getCompanies, getTrending } from '@/constants/api';

/** The ticker checklist shared by onboarding step 2 and the post-onboarding
 * "Edit" entry point off Watchlist -- same list, same search, same
 * checkbox rows; only the surrounding chrome and what happens on submit
 * differ between the two call sites. */
export function TickerPicker({
  initialPicked,
  ctaLabel,
  onSubmit,
}: {
  initialPicked: string[] | null;
  ctaLabel: string;
  onSubmit: (tickers: string[]) => void;
}) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [volumeByTicker, setVolumeByTicker] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[] | null>(initialPicked);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCompanies(), getTrending(50, 7)])
      .then(([companyList, trending]) => {
        if (cancelled) return;
        setCompanies(companyList);
        setVolumeByTicker(Object.fromEntries(trending.map((t) => [t.ticker, t.article_count])));
        setPicked((prev) => prev ?? companyList.map((c) => c.ticker));
      })
      .catch(() => {
        if (!cancelled) setCompanies([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) => c.ticker.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [companies, query]);

  function toggle(ticker: string) {
    setPicked((prev) => {
      const cur = prev ?? companies.map((c) => c.ticker);
      return cur.includes(ticker) ? cur.filter((x) => x !== ticker) : [...cur, ticker];
    });
  }

  const activePicks = picked ?? companies.map((c) => c.ticker);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchRow}>
        <SearchIcon />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search a company or ticker"
          placeholderTextColor={Colors.neutral500}
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.text} />
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 8 }}>
          {visible.map((c) => {
            const on = activePicks.includes(c.ticker);
            const vol = volumeByTicker[c.ticker];
            return (
              <Pressable key={c.ticker} onPress={() => toggle(c.ticker)} style={styles.row}>
                <View style={[styles.checkbox, { backgroundColor: on ? Colors.text : 'transparent' }]}>
                  {on && <CheckIcon size={12} color={Colors.bg} />}
                </View>
                <Text style={styles.ticker}>{c.ticker}</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={styles.vol}>{!vol ? 'quiet' : `${vol}/wk`}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <View style={styles.hr} />
        <Pressable onPress={() => onSubmit(activePicks)} style={styles.cta}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
          <ArrowRightIcon color={Colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: Colors.divider,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    marginHorizontal: 20,
    marginBottom: 2,
  },
  searchInput: { flex: 1, fontFamily: Fonts.body, fontSize: 14, color: Colors.text },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1, marginTop: 14, paddingHorizontal: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral300,
  },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: Colors.text, alignItems: 'center', justifyContent: 'center' },
  ticker: { fontFamily: Fonts.heading, fontSize: 16, width: 62, color: Colors.text },
  name: { flex: 1, fontFamily: Fonts.body, fontSize: 14, color: Colors.neutral700 },
  vol: { fontFamily: Fonts.body, fontSize: 11, color: Colors.neutral600 },
  footer: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, gap: 10 },
  hr: { height: 2, backgroundColor: Colors.divider },
  cta: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaText: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.text },
});

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Swipeable } from "react-native-gesture-handler";
import { BookTile } from "@/components/BookTile";
import { ErrorFallback } from "@/components/ErrorFallback";
import { GlassCard } from "@/components/GlassCard";
import { LoadingState } from "@/components/layout/LoadingState";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { MomentumDashboard } from "@/components/dashboard/MomentumDashboard";
import { ReadingPlanCard } from "@/components/dashboard/ReadingPlanCard";
import { TopicGrid } from "@/components/topics/TopicGrid";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useBooks, useDatabaseReady, useVerseSearch } from "@/hooks/useScripture";
import { useBookmarksStore } from "@/store/bookmarksStore";
import { useHistoryStore } from "@/store/historyStore";
import { useOnboardingStore } from "@/store/onboardingStore";
import { useSelectionStore } from "@/store/selectionStore";
import { useYearPlanStore } from "@/store/yearPlanStore";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import type { Book, Testament, VerseWithReference } from "@/types/scripture";
import { useLocaleStore } from "@/store/localeStore";
import { getDeviceLocale } from "@/i18n";
import { formatBookReference, getBookDisplayName } from "@/i18n/bookNames";
import { HighlightedText } from "@/utils/highlightText";
import { formatShortDate } from "@/utils/formatDate";
import { colors, radii, spacing, typography } from "@/theme";

const TESTAMENTS: readonly Testament[] = ["OT", "NT"];
const MIN_SEARCH_LEN = 2;

function dedupeRecent<T extends { book_slug?: string; chapter: number }>(entries: T[], max: number): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const entry of entries) {
    const key = `${entry.book_slug ?? ""}-${entry.chapter}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(entry);
    if (result.length >= max) {
      break;
    }
  }
  return result;
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale) ?? getDeviceLocale();
  const router = useRouter();
  const [testament, setTestament] = useState<Testament>("OT");
  const [query, setQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 350);
  const { ready, error, retry } = useDatabaseReady();
  const { books, loading, refresh: refreshBooks } = useBooks(testament);
  const { results, searching, search, clear } = useVerseSearch();
  const { history, addToHistory, clearHistory, removeFromHistory } = useSearchHistory();
  const hasSeenLanguageTip = useOnboardingStore((s) => s.hasSeenLanguageTip);
  const dismissLanguageTip = useOnboardingStore((s) => s.dismissLanguageTip);
  const lastRead = useHistoryStore((s) => s.lastRead);
  const recent = useHistoryStore((s) => s.recent);
  const loadHistory = useHistoryStore((s) => s.loadHistory);
  const bookmarks = useBookmarksStore((s) => s.bookmarks);
  const loadBookmarks = useBookmarksStore((s) => s.loadBookmarks);
  const yearPlanStartDate = useYearPlanStore((s) => s.startDate);
  const yearPlanGetCurrentDay = useYearPlanStore((s) => s.getCurrentDay);
  const yearPlanGetProgress = useYearPlanStore((s) => s.getProgress);
  const yearPlanLoad = useYearPlanStore((s) => s.load);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadHistory(), loadBookmarks(), refreshBooks(), yearPlanLoad()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadBookmarks, loadHistory, refreshBooks, yearPlanLoad]);

  useEffect(() => {
    void loadHistory();
    void loadBookmarks();
    void yearPlanLoad();
  }, [loadHistory, loadBookmarks, yearPlanLoad]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length >= MIN_SEARCH_LEN) {
      void search(trimmed);
    } else {
      clear();
    }
  }, [clear, debouncedQuery, search]);

  const recentUnique = useMemo(() => dedupeRecent(recent, 3), [recent]);
  const bookmarkPreview = useMemo(() => bookmarks.slice(0, 2), [bookmarks]);

  const setSelectedVerse = useSelectionStore((s) => s.setSelectedVerse);

  const openBook = useCallback(
    (book: Book) => {
      router.push(`/book/${book.slug}`);
    },
    [router]
  );

  const openReader = useCallback(
    async (bookSlug: string, chapter: number, verseNumber?: number, verseText?: string) => {
      if (verseNumber) {
        const book = books.find((b) => b.slug === bookSlug) ||
                     await scriptureRepo.getBookBySlug(bookSlug);
        if (book) {
          setSelectedVerse({
            bookId: book.id,
            bookName: getBookDisplayName(book.slug, locale, book.name),
            bookSlug: book.slug,
            chapter,
            verse: verseNumber,
            text: verseText ?? "",
          });
        }
      }
      router.push(
        verseNumber
          ? `/reader/${bookSlug}/${chapter}?verse=${verseNumber}`
          : `/reader/${bookSlug}/${chapter}`
      );
    },
    [books, locale, router, setSelectedVerse]
  );

  const openSearchHit = useCallback(
    (hit: VerseWithReference) => {
      void addToHistory(debouncedQuery.trim());
      void openReader(hit.book_slug, hit.chapter_number, hit.number, hit.text);
    },
    [addToHistory, debouncedQuery, openReader]
  );

  const resumeReading = useCallback(() => {
    if (lastRead?.book_slug) {
      void openReader(lastRead.book_slug, lastRead.chapter, lastRead.verse);
    }
  }, [lastRead, openReader]);

  const startReading = useCallback(() => {
    if (lastRead?.book_slug) {
      resumeReading();
      return;
    }
    const firstBook = books[0];
    if (firstBook) {
      router.push(`/book/${firstBook.slug}`);
      return;
    }
    router.push("/book/genesis");
  }, [books, lastRead, resumeReading, router]);

  const openTopic = useCallback(
    (slug: string) => {
      router.push(`/topic/${slug}`);
    },
    [router]
  );

  if (error) {
    return <ErrorFallback message={error} onRetry={retry} />;
  }

  if (!ready) {
    return (
      <View style={styles.centered}>
        <LoadingState message={t("home.preparingLibrary")} />
      </View>
    );
  }

  const trimmedQuery = query.trim();
  const showSearch = trimmedQuery.length >= MIN_SEARCH_LEN;
  const searchHint =
    trimmedQuery.length > 0 && trimmedQuery.length < MIN_SEARCH_LEN
      ? t("home.searchHint", { count: MIN_SEARCH_LEN - trimmedQuery.length })
      : null;
  const showSearchHistory = isSearchFocused && history.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.backgroundElevated}
          />
        }
      >
        <View style={styles.brandRow}>
          <Text style={styles.brand}>{t("common.appName")}</Text>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={12}
            accessibilityLabel={t("home.openSettings")}
          >
            <Ionicons name="settings-outline" size={22} color={colors.accent} />
          </Pressable>
        </View>

        <Pressable
          onPress={startReading}
          style={({ pressed }) => [styles.primaryCta, pressed && styles.primaryCtaPressed]}
          accessibilityRole="button"
          accessibilityLabel={t("home.readScripture")}
        >
          <Ionicons name="book-outline" size={20} color={colors.canvas} />
          <Text style={styles.primaryCtaText}>{t("home.readScripture")}</Text>
        </Pressable>

        <MomentumDashboard style={styles.dashboard} />

        {!hasSeenLanguageTip ? (
          <GlassCard style={styles.languageTip}>
            <View style={styles.languageTipContent}>
              <Ionicons name="language-outline" size={18} color={colors.accent} />
              <Text style={styles.languageTipBody}>{t("home.languageTipBody")}</Text>
            </View>
            <View style={styles.languageTipActions}>
              <Pressable
                onPress={() => router.push("/settings")}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("home.languageTipOpenSettings")}
              >
                <Text style={styles.languageTipLink}>{t("home.languageTipOpenSettings")}</Text>
              </Pressable>
              <Pressable
                onPress={dismissLanguageTip}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("home.languageTipDismiss")}
              >
                <Text style={styles.languageTipDismiss}>{t("home.languageTipDismiss")}</Text>
              </Pressable>
            </View>
          </GlassCard>
        ) : null}

        {lastRead?.book_slug ? (
          <Pressable onPress={resumeReading}>
            <GlassCard style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>{t("home.continueReading")}</Text>
              <Text style={styles.sectionTitle}>
                {formatBookReference(
                  lastRead.book_slug,
                  lastRead.chapter,
                  lastRead.verse,
                  locale,
                  lastRead.book_name ?? t("common.scripture")
                )}
              </Text>
            </GlassCard>
          </Pressable>
        ) : null}

        <ReadingPlanCard style={styles.sectionCard} />

        {yearPlanStartDate ? (
          <Pressable onPress={() => router.push("/reading-plan")} style={styles.planLink}>
            <Ionicons name="earth-outline" size={16} color={colors.accent} />
            <Text style={styles.planLinkText}>
              {t("plan.dayLabel", { day: yearPlanGetCurrentDay() })} · {t("plan.progressLabel", { percent: yearPlanGetProgress() })}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}

        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          placeholder={t("home.searchPlaceholder")}
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={t("home.searchPlaceholder")}
          onSubmitEditing={() => {
            const trimmed = query.trim();
            if (trimmed.length >= MIN_SEARCH_LEN) {
              void addToHistory(trimmed);
            }
          }}
        />
        {searchHint ? <Text style={styles.searchHint}>{searchHint}</Text> : null}

        {showSearchHistory ? (
          <View style={styles.searchHistory}>
            <View style={styles.searchHistoryHeader}>
              <Text style={styles.searchHistoryTitle}>{t("home.recentSearches")}</Text>
              <Pressable
                onPress={() => void clearHistory()}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("home.clearSearchHistory")}
              >
                <Text style={styles.searchHistoryClear}>{t("home.clearSearchHistory")}</Text>
              </Pressable>
            </View>
            {history.map((item) => (
              <Swipeable
                key={item}
                overshootRight={false}
                renderRightActions={() => (
                  <Pressable
                    onPress={() => void removeFromHistory(item)}
                    style={styles.searchHistoryDelete}
                    accessibilityRole="button"
                    accessibilityLabel={t("common.delete")}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.canvas} />
                    <Text style={styles.searchHistoryDeleteText}>{t("common.delete")}</Text>
                  </Pressable>
                )}
              >
                <Pressable
                  onPress={() => setQuery(item)}
                  style={styles.searchHistoryItem}
                  accessibilityRole="button"
                  accessibilityLabel={item}
                >
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.searchHistoryText}>{item}</Text>
                </Pressable>
              </Swipeable>
            ))}
          </View>
        ) : null}

        {showSearch ? (
          <View>
            {searching ? (
              <LoadingState variant="inline" message={t("common.loading")} />
            ) : null}
            {!searching && results.length === 0 ? (
              <View style={styles.emptySearch}>
                <Ionicons name="search-outline" size={32} color={colors.textMuted} />
                <Text style={styles.empty}>
                  {t("home.noResults", { query: debouncedQuery.trim() })}
                </Text>
                <Text style={styles.emptySub}>{t("home.noResultsHint")}</Text>
              </View>
            ) : null}
            {results.map((item) => (
              <Pressable key={item.id} onPress={() => openSearchHit(item)} style={styles.searchHit}>
                <Text style={styles.searchRef}>
                  {formatBookReference(
                    item.book_slug,
                    item.chapter_number,
                    item.number,
                    locale,
                    item.book_name
                  )}
                </Text>
                <HighlightedText
                  text={item.text}
                  query={debouncedQuery.trim()}
                  style={styles.searchSnippet}
                  numberOfLines={3}
                />
              </Pressable>
            ))}
          </View>
        ) : (
          <>
            <View style={styles.tabs}>
              {TESTAMENTS.map((testamentKey) => (
                <Pressable
                  key={testamentKey}
                  onPress={() => setTestament(testamentKey)}
                  style={[styles.tab, testament === testamentKey && styles.tabActive]}
                >
                  <Text style={[styles.tabText, testament === testamentKey && styles.tabTextActive]}>
                    {testamentKey === "OT" ? t("home.oldTestament") : t("home.newTestament")}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.verseTextNotice}>{t("home.verseTextLocaleNotice")}</Text>

            {loading ? (
              <LoadingState variant="grid" message={t("common.loading")} />
            ) : (
              <View style={styles.bookGrid}>
                {books.map((item) => (
                  <View key={item.id} style={styles.bookCell}>
                    <BookTile book={item} onPress={() => openBook(item)} />
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {(recentUnique.length > 0 || bookmarkPreview.length > 0) ? (
          <View style={styles.secondarySection}>
            {recentUnique.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader title={t("home.recentlyRead")} />
                {recentUnique.map((entry) => (
                  <Pressable
                    key={`${entry.id}-${entry.viewed_at}`}
                    onPress={() => {
                      if (entry.book_slug) {
                        void openReader(entry.book_slug, entry.chapter, entry.verse);
                      }
                    }}
                  >
                    <GlassCard style={styles.listRow}>
                      <Text style={styles.listRowTitle}>
                        {formatBookReference(
                          entry.book_slug,
                          entry.chapter,
                          entry.verse,
                          locale,
                          entry.book_name ?? t("common.scripture")
                        )}
                      </Text>
                      <Text style={styles.listRowMeta}>
                        {formatShortDate(entry.viewed_at, locale)}
                      </Text>
                    </GlassCard>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {bookmarkPreview.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader
                  title={t("home.bookmarks")}
                  actionLabel={t("common.seeAll")}
                  onAction={() => router.push("/(tabs)/workspace")}
                  actionAccessibilityLabel={t("common.seeAll")}
                />
                {bookmarkPreview.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      if (item.book_slug) {
                        void openReader(item.book_slug, item.chapter, item.verse, item.verse_text ?? "");
                      }
                    }}
                  >
                    <GlassCard style={styles.listRow}>
                      <Text style={styles.listRowTitle}>
                        {formatBookReference(
                          item.book_slug,
                          item.chapter,
                          item.verse,
                          locale,
                          item.book_name ?? t("common.scripture")
                        )}
                      </Text>
                    </GlassCard>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <TopicGrid onTopicPress={openTopic} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  brand: {
    ...typography.label,
    color: colors.accent,
  },
  primaryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  primaryCtaPressed: {
    opacity: 0.9,
  },
  primaryCtaText: {
    ...typography.subtitle,
    color: colors.canvas,
    fontWeight: "700",
  },
  dashboard: {
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
  },
  secondarySection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorder,
  },
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  listRow: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
  },
  listRowTitle: {
    ...typography.subtitle,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  listRowMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  search: {
    backgroundColor: colors.inputBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    ...typography.body,
  },
  searchHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  tabs: {
    flexDirection: "row",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: colors.accentGlow,
    borderColor: colors.accent,
  },
  tabText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.accent,
  },
  verseTextNotice: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  bookGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.xs,
  },
  bookCell: {
    width: "50%",
    padding: spacing.xs,
  },
  emptySearch: {
    alignItems: "center",
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  emptySub: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
  searchHit: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  searchRef: {
    ...typography.caption,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  searchSnippet: {
    ...typography.body,
    color: colors.textSecondary,
  },
  languageTip: {
    marginBottom: spacing.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  languageTipContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  languageTipBody: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  languageTipActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  languageTipLink: {
    ...typography.caption,
    color: colors.accent,
  },
  languageTipDismiss: {
    ...typography.caption,
    color: colors.textMuted,
  },
  searchHistory: {
    marginBottom: spacing.md,
  },
  searchHistoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  searchHistoryTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  searchHistoryClear: {
    ...typography.caption,
    color: colors.accent,
  },
  searchHistoryDelete: {
    width: 88,
    marginBottom: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  searchHistoryDeleteText: {
    ...typography.caption,
    color: colors.canvas,
  },
  searchHistoryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.inputBackground,
  },
  searchHistoryText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  planLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  planLinkText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
});

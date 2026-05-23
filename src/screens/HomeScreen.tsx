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
import { EcosystemModal } from "@/components/EcosystemModal";
import { ErrorFallback } from "@/components/ErrorFallback";
import { GlassCard } from "@/components/GlassCard";
import { LoadingState } from "@/components/layout/LoadingState";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { MomentumDashboard } from "@/components/dashboard/MomentumDashboard";
import { ReadingPlanCard } from "@/components/dashboard/ReadingPlanCard";
import { OfflineBadge } from "@/components/OfflineBadge";
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
  const hasSeenEcosystemModal = useOnboardingStore((s) => s.hasSeenEcosystemModal);
  const dismissEcosystemModal = useOnboardingStore((s) => s.dismissEcosystemModal);
  const [ecosystemModalVisible, setEcosystemModalVisible] = useState(false);
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
    if (ready && !hasSeenEcosystemModal) {
      const timer = setTimeout(() => {
        setEcosystemModalVisible(true);
        dismissEcosystemModal();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [ready, hasSeenEcosystemModal, dismissEcosystemModal]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length >= MIN_SEARCH_LEN) {
      void search(trimmed);
    } else {
      clear();
    }
  }, [clear, debouncedQuery, search]);

  const recentUnique = useMemo(() => dedupeRecent(recent, 5), [recent]);
  const bookmarkPreview = useMemo(() => bookmarks.slice(0, 3), [bookmarks]);

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
            bookName: book.name,
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
    [books, router, setSelectedVerse]
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
          <View style={styles.brandActions}>
            <OfflineBadge ready={ready} />
            <Pressable
              onPress={() => router.push("/stats")}
              hitSlop={12}
              style={styles.statsBtn}
              accessibilityLabel={t("stats.title")}
            >
              <Ionicons name="bar-chart-outline" size={20} color={colors.accent} />
            </Pressable>
            <Pressable
              onPress={() => router.push("/settings")}
              hitSlop={12}
              accessibilityLabel={t("home.openSettings")}
            >
              <Ionicons name="settings-outline" size={22} color={colors.accent} />
            </Pressable>
          </View>
        </View>

        <MomentumDashboard style={styles.dashboard} />

        {!hasSeenLanguageTip ? (
          <GlassCard style={styles.languageTip}>
            <View style={styles.languageTipContent}>
              <Ionicons name="language-outline" size={20} color={colors.accent} />
              <View style={styles.languageTipText}>
                <Text style={styles.languageTipTitle}>{t("home.languageTipTitle")}</Text>
                <Text style={styles.languageTipBody}>{t("home.languageTipBody")}</Text>
              </View>
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
                {lastRead.book_name ?? t("common.scripture")} {lastRead.chapter}:{lastRead.verse}
              </Text>
            </GlassCard>
          </Pressable>
        ) : null}

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
                    {entry.book_name ?? t("common.scripture")} {entry.chapter}:{entry.verse}
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
                    {item.book_name ?? t("common.scripture")} {item.chapter}:{item.verse}
                  </Text>
                  <Text style={styles.listRowSnippet} numberOfLines={2}>
                    {item.verse_text ?? ""}
                  </Text>
                </GlassCard>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.plansSection}>
          <SectionHeader title={t("home.plansHeading")} />
          <ReadingPlanCard style={styles.sectionCard} />
          <Pressable onPress={() => router.push("/reading-plan")} style={styles.planTeaser}>
            <View style={styles.planTeaserIcon}>
              <Ionicons name="earth-outline" size={20} color={colors.accent} />
            </View>
            {yearPlanStartDate ? (
              <View style={styles.planTeaserText}>
                <Text style={styles.planTeaserTitle}>{t("home.planTeaserTitle")}</Text>
                <Text style={styles.planTeaserSub}>
                  {t("plan.dayLabel", { day: yearPlanGetCurrentDay() })}
                </Text>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${yearPlanGetProgress()}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressBarLabel}>
                  {t("plan.progressLabel", { percent: yearPlanGetProgress() })}
                </Text>
              </View>
            ) : (
              <View style={styles.planTeaserText}>
                <Text style={styles.planTeaserTitle}>{t("home.planTeaserTitle")}</Text>
                <Text style={styles.planTeaserSub}>{t("home.planTeaserSub")}</Text>
                <Text style={styles.planTeaserStart}>{t("plan.startPlan")} →</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <TopicGrid onTopicPress={openTopic} />

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
                  {item.book_name} {item.chapter_number}:{item.number}
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
      </ScrollView>
      <EcosystemModal
        visible={ecosystemModalVisible}
        onClose={() => setEcosystemModalVisible(false)}
      />
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
  brandActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statsBtn: { padding: spacing.xs },
  brand: {
    ...typography.label,
    color: colors.accent,
  },
  dashboard: {
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
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
  sectionHeading: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionLink: {
    ...typography.caption,
    color: colors.accent,
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
  listRowSnippet: {
    ...typography.body,
    color: colors.textSecondary,
  },
  search: {
    backgroundColor: colors.inputBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.lg,
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
  bookGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.xs,
  },
  bookCell: {
    width: "50%",
    padding: spacing.xs,
  },
  spinner: {
    marginTop: spacing.xl,
  },
  loadingLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  error: {
    ...typography.body,
    color: colors.danger,
    textAlign: "center",
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
  searchSpinner: {
    marginVertical: spacing.md,
  },
  languageTip: {
    marginBottom: spacing.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  languageTipContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  languageTipText: {
    flex: 1,
  },
  languageTipTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  languageTipBody: {
    ...typography.caption,
    color: colors.textMuted,
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
  planTeaser: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
    marginBottom: spacing.md,
  },
  planTeaserIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(229, 169, 60, 0.12)",
  },
  planTeaserText: {
    flex: 1,
  },
  planTeaserTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  planTeaserSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  planTeaserStart: {
    ...typography.caption,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  plansSection: {
    marginBottom: spacing.md,
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.glassBorder,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  progressBarLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

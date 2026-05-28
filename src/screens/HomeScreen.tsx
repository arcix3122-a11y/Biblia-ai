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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionTile } from "@/components/dashboard/ActionTile";
import { BookTile } from "@/components/BookTile";
import { ErrorFallback } from "@/components/ErrorFallback";
import { GlassCard } from "@/components/GlassCard";
import { HeroCard } from "@/components/dashboard/HeroCard";
import { DailyPracticeCard } from "@/components/dashboard/DailyPracticeCard";
import { GuidedReflectionCards } from "@/components/dashboard/GuidedReflectionCards";
import { LoadingState } from "@/components/layout/LoadingState";
import { VotdFeedCard } from "@/components/dashboard/VotdFeedCard";
import { TopicGrid } from "@/components/topics/TopicGrid";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useBooks, useDatabaseReady, useVerseSearch } from "@/hooks/useScripture";
import { useBookmarksStore } from "@/store/bookmarksStore";
import { useHistoryStore } from "@/store/historyStore";
import { useSelectionStore } from "@/store/selectionStore";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import type { Book, Testament, VerseWithReference } from "@/types/scripture";
import { useLocaleStore } from "@/store/localeStore";
import { useActiveTranslation } from "@/store/translationStore";
import { getDeviceLocale } from "@/i18n";
import { formatBookReference, getBookDisplayName } from "@/i18n/bookNames";
import { getCategoryPhotoUrl, HOME_TILE_PHOTOS } from "@/data/photoBackgrounds";
import { HighlightedText } from "@/utils/highlightText";
import { formatShortDate } from "@/utils/formatDate";
import { colors, radii, spacing, typography } from "@/theme";

const TESTAMENTS: readonly Testament[] = ["OT", "NT"];
const MIN_SEARCH_LEN = 2;

function dedupeRecent<T extends { book_slug?: string; chapter: number }>(
  entries: T[],
  max: number
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const entry of entries) {
    const key = `${entry.book_slug ?? ""}-${entry.chapter}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
    if (result.length >= max) break;
  }
  return result;
}

function getGreetingKey(): "viralFeed.greetingMorning" | "viralFeed.greetingAfternoon" | "viralFeed.greetingEvening" {
  const hour = new Date().getHours();
  if (hour < 12) return "viralFeed.greetingMorning";
  if (hour < 17) return "viralFeed.greetingAfternoon";
  return "viralFeed.greetingEvening";
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = useLocaleStore((s) => s.locale) ?? getDeviceLocale();
  const translation = useActiveTranslation(locale);
  const router = useRouter();
  const [testament, setTestament] = useState<Testament>("OT");
  const [query, setQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 350);
  const { ready, error, retry } = useDatabaseReady();
  const { books, loading, refresh: refreshBooks } = useBooks(testament);
  const { results, searching, search, clear } = useVerseSearch();
  const { history, addToHistory, clearHistory, removeFromHistory } = useSearchHistory();
  const lastRead = useHistoryStore((s) => s.lastRead);
  const recent = useHistoryStore((s) => s.recent);
  const loadHistory = useHistoryStore((s) => s.loadHistory);
  const bookmarks = useBookmarksStore((s) => s.bookmarks);
  const loadBookmarks = useBookmarksStore((s) => s.loadBookmarks);
  const [refreshing, setRefreshing] = useState(false);
  const [votdText, setVotdText] = useState("");
  const [votdRef, setVotdRef] = useState("");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadHistory(), loadBookmarks(), refreshBooks()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadBookmarks, loadHistory, refreshBooks]);

  useEffect(() => {
    void loadHistory();
    void loadBookmarks();
  }, [loadHistory, loadBookmarks]);

  useEffect(() => {
    void loadBookmarks();
  }, [loadBookmarks, translation]);

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
        const book =
          books.find((b) => b.slug === bookSlug) ||
          (await scriptureRepo.getBookBySlug(bookSlug));
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

  const hasContinue = Boolean(lastRead?.book_slug);
  const heroTitle = hasContinue
    ? formatBookReference(
        lastRead!.book_slug!,
        lastRead!.chapter,
        lastRead!.verse,
        locale,
        lastRead!.book_name ?? t("common.scripture")
      )
    : t("home.welcomeTitle");
  const heroSubtitle = hasContinue
    ? t("home.continueSubtitle")
    : t("home.welcomeSubtitle");
  const heroCta = hasContinue ? t("home.continueReading") : t("home.readNow");
  const heroEyebrow = hasContinue ? t("home.continueReading") : t("common.appName");
  const greetingKey = getGreetingKey();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.sm }]}
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
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>{t(greetingKey)}</Text>
            <Text style={styles.brand}>{t("common.appName")}</Text>
          </View>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={12}
            style={styles.headerIcon}
            accessibilityLabel={t("home.openSettings")}
          >
            <Ionicons name="settings-outline" size={20} color={colors.accent} />
          </Pressable>
        </View>

        <Text style={styles.sectionHeading}>{t("home.todaySection")}</Text>

        <HeroCard
          eyebrow={heroEyebrow}
          title={heroTitle}
          subtitle={heroSubtitle}
          ctaLabel={heroCta}
          photoUrl={getCategoryPhotoUrl("continueReading", 900, 600)}
          onPress={startReading}
        />

        <DailyPracticeCard />

        <VotdFeedCard
          onVerse={(text, ref) => {
            setVotdText(text);
            setVotdRef(ref);
          }}
        />

        <GuidedReflectionCards verseText={votdText} verseReference={votdRef} />

        <Text style={styles.sectionHeading}>{t("home.exploreHeading")}</Text>
        <ActionTile
          icon="grid-outline"
          title={t("devotionals.hubTileTitle")}
          subtitle={t("devotionals.hubTileSub")}
          badge={t("common.new")}
          layout="horizontal"
          imageUrl={getCategoryPhotoUrl("guidedSilence", 600, 400)}
          onPress={() => router.push("/devotional-hub")}
        />
        <View style={styles.tileRow}>
          <ActionTile
            icon="musical-notes-outline"
            title={t("affirmations.homeTileTitle")}
            subtitle={t("affirmations.homeTileSub")}
            badge={t("common.new")}
            imageUrl={HOME_TILE_PHOTOS.affirmations}
            onPress={() => router.push("/affirmations")}
          />
          <ActionTile
            icon="sparkles-outline"
            title={t("home.tileCompanion")}
            subtitle={t("home.tileCompanionSub")}
            imageUrl={HOME_TILE_PHOTOS.companion}
            onPress={() => router.push("/(tabs)/ai")}
          />
        </View>
        <View style={styles.tileRow}>
          <ActionTile
            icon="calendar-outline"
            title={t("home.tilePlan")}
            subtitle={t("home.tilePlanSub")}
            imageUrl={HOME_TILE_PHOTOS.plan}
            onPress={() => router.push("/reading-plan")}
          />
          <ActionTile
            icon="heart-outline"
            title={t("home.tilePrayer")}
            subtitle={t("home.tilePrayerSub")}
            imageUrl={HOME_TILE_PHOTOS.prayer}
            onPress={() => router.push("/guided-prayer")}
          />
        </View>
        <Pressable
          onPress={() => router.push("/stats")}
          style={styles.statsLink}
          accessibilityRole="button"
          accessibilityLabel={t("home.tileStats")}
        >
          <Ionicons name="stats-chart-outline" size={16} color={colors.accent} />
          <Text style={styles.statsLinkText}>{t("home.tileStats")}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>

        <Text style={styles.sectionHeading}>{t("home.libraryHeading")}</Text>
        <View style={styles.libraryCard}>
          <View style={styles.searchRow}>
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.textMuted}
              style={styles.searchIcon}
            />
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
          </View>
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
              {searching ? <LoadingState variant="inline" message={t("common.loading")} /> : null}
              {!searching && results.length === 0 ? (
                <View style={styles.emptySearchCompact}>
                  <Ionicons name="search-outline" size={32} color={colors.textMuted} />
                  <Text style={styles.empty}>
                    {t("home.noResults", { query: debouncedQuery.trim() })}
                  </Text>
                  <Text style={styles.emptySub}>{t("home.noResultsHint")}</Text>
                </View>
              ) : null}
              {results.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => openSearchHit(item)}
                  style={styles.searchHit}
                >
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
                    <Text
                      style={[styles.tabText, testament === testamentKey && styles.tabTextActive]}
                    >
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

              <Text style={styles.verseTextNotice}>
                {translation === "pl"
                  ? t("home.verseTextLocaleNoticePl")
                  : t("home.verseTextLocaleNoticeEn")}
              </Text>
            </>
          )}
        </View>

        {recentUnique.length > 0 || bookmarkPreview.length > 0 ? (
          <>
            <Text style={styles.sectionHeading}>{t("home.discoveryHeading")}</Text>
            {recentUnique.length > 0 ? (
              <View style={styles.subSection}>
                <Text style={styles.subSectionTitle}>{t("home.recentlyRead")}</Text>
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
              <View style={styles.subSection}>
                <View style={styles.subSectionRow}>
                  <Text style={styles.subSectionTitle}>{t("home.bookmarks")}</Text>
                  <Pressable onPress={() => router.push("/(tabs)/workspace")}>
                    <Text style={styles.subSectionAction}>{t("common.seeAll")}</Text>
                  </Pressable>
                </View>
                {bookmarkPreview.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      if (item.book_slug) {
                        void openReader(
                          item.book_slug,
                          item.chapter,
                          item.verse,
                          item.verse_text ?? ""
                        );
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
          </>
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
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  headerCopy: {
    flex: 1,
  },
  greeting: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  brand: {
    ...typography.label,
    color: colors.accent,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeading: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  tileRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
  },
  statsLinkText: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
    fontWeight: "600",
  },
  libraryCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  search: {
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  searchHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  tabs: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
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
    marginTop: spacing.xs,
  },
  bookCell: {
    width: "50%",
    padding: spacing.xs,
  },
  verseTextNotice: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  emptySearchCompact: {
    alignItems: "center",
    marginVertical: spacing.md,
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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
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
  searchHistory: {
    marginBottom: spacing.sm,
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
    letterSpacing: 0.4,
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
  subSection: {
    marginBottom: spacing.sm,
  },
  subSectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.4,
  },
  subSectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  subSectionAction: {
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
});

import React, { useCallback, useEffect, useState } from "react";
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
import { BookTile } from "@/components/BookTile";
import { ErrorFallback } from "@/components/ErrorFallback";
import { LoadingState } from "@/components/layout/LoadingState";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useBooks, useDatabaseReady, useVerseSearch } from "@/hooks/useScripture";
import { useSelectionStore } from "@/store/selectionStore";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import type { Book, Testament, VerseWithReference } from "@/types/scripture";
import { useLocaleStore } from "@/store/localeStore";
import { useActiveTranslation } from "@/store/translationStore";
import { getDeviceLocale } from "@/i18n";
import { formatBookReference, getBookDisplayName } from "@/i18n/bookNames";
import { HighlightedText } from "@/utils/highlightText";
import { colors, radii, spacing, typography } from "@/theme";

const TESTAMENTS: readonly Testament[] = ["OT", "NT"];
const MIN_SEARCH_LEN = 2;

export default function LibraryScreen() {
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
  const [refreshing, setRefreshing] = useState(false);
  const setSelectedVerse = useSelectionStore((s) => s.setSelectedVerse);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshBooks();
    } finally {
      setRefreshing(false);
    }
  }, [refreshBooks]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length >= MIN_SEARCH_LEN) {
      void search(trimmed);
    } else {
      clear();
    }
  }, [clear, debouncedQuery, search]);

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

  if (error) {
    return <ErrorFallback message={error} onRetry={retry} />;
  }

  if (!ready) {
    return (
      <View style={styles.centered}>
        <LoadingState message={t("library.preparingLibrary")} />
      </View>
    );
  }

  const trimmedQuery = query.trim();
  const showSearch = trimmedQuery.length >= MIN_SEARCH_LEN;
  const searchHint =
    trimmedQuery.length > 0 && trimmedQuery.length < MIN_SEARCH_LEN
      ? t("library.searchHint", { count: MIN_SEARCH_LEN - trimmedQuery.length })
      : null;
  const showSearchHistory = isSearchFocused && history.length > 0;

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
              placeholder={t("library.searchPlaceholder")}
              placeholderTextColor={colors.textMuted}
              style={styles.search}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel={t("library.searchPlaceholder")}
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
                <Text style={styles.searchHistoryTitle}>{t("library.recentSearches")}</Text>
                <Pressable
                  onPress={() => void clearHistory()}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("library.clearSearchHistory")}
                >
                  <Text style={styles.searchHistoryClear}>{t("library.clearSearchHistory")}</Text>
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
                    {t("library.noResults", { query: debouncedQuery.trim() })}
                  </Text>
                  <Text style={styles.emptySub}>{t("library.noResultsHint")}</Text>
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
                      {testamentKey === "OT" ? t("library.oldTestament") : t("library.newTestament")}
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
                  ? t("library.verseTextLocaleNoticePl")
                  : t("library.verseTextLocaleNoticeEn")}
              </Text>
            </>
          )}
        </View>
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
});

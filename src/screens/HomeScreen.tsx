import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BookTile } from "@/components/BookTile";
import { GlassCard } from "@/components/GlassCard";
import { MomentumDashboard } from "@/components/dashboard/MomentumDashboard";
import { TopicGrid } from "@/components/topics/TopicGrid";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useBooks, useDatabaseReady, useVerseSearch } from "@/hooks/useScripture";
import { useBookmarksStore } from "@/store/bookmarksStore";
import { useHistoryStore } from "@/store/historyStore";
import type { Book, Testament, VerseWithReference } from "@/types/scripture";
import { HighlightedText } from "@/utils/highlightText";
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
  const router = useRouter();
  const [testament, setTestament] = useState<Testament>("OT");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 350);
  const { ready, error } = useDatabaseReady();
  const { books, loading } = useBooks(testament);
  const { results, searching, search, clear } = useVerseSearch();
  const lastRead = useHistoryStore((s) => s.lastRead);
  const recent = useHistoryStore((s) => s.recent);
  const loadHistory = useHistoryStore((s) => s.loadHistory);
  const bookmarks = useBookmarksStore((s) => s.bookmarks);
  const loadBookmarks = useBookmarksStore((s) => s.loadBookmarks);

  useEffect(() => {
    void loadHistory();
    void loadBookmarks();
  }, [loadHistory, loadBookmarks]);

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

  const openBook = useCallback(
    (book: Book) => {
      router.push(`/book/${book.slug}`);
    },
    [router]
  );

  const openReader = useCallback(
    (bookSlug: string, chapter: number) => {
      router.push(`/reader/${bookSlug}/${chapter}`);
    },
    [router]
  );

  const openSearchHit = useCallback(
    (hit: VerseWithReference) => {
      openReader(hit.book_slug, hit.chapter_number);
    },
    [openReader]
  );

  const resumeReading = useCallback(() => {
    if (lastRead?.book_slug) {
      openReader(lastRead.book_slug, lastRead.chapter);
    }
  }, [lastRead, openReader]);

  const openTopic = useCallback(
    (slug: string) => {
      router.push(`/topic/${slug}`);
    },
    [router]
  );

  if (!ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingLabel}>Preparing Scripture library…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  const trimmedQuery = query.trim();
  const showSearch = trimmedQuery.length >= MIN_SEARCH_LEN;
  const searchHint =
    trimmedQuery.length > 0 && trimmedQuery.length < MIN_SEARCH_LEN
      ? `Type ${MIN_SEARCH_LEN - trimmedQuery.length} more character(s) to search.`
      : null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <Text style={styles.brand}>SolidCode · Biblia AI</Text>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={12}
            accessibilityLabel="Open settings"
          >
            <Ionicons name="settings-outline" size={22} color={colors.accent} />
          </Pressable>
        </View>

        <MomentumDashboard style={styles.dashboard} />

        {lastRead?.book_slug ? (
          <Pressable onPress={resumeReading}>
            <GlassCard style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>Continue reading</Text>
              <Text style={styles.sectionTitle}>
                {lastRead.book_name ?? "Scripture"} {lastRead.chapter}:{lastRead.verse}
              </Text>
            </GlassCard>
          </Pressable>
        ) : null}

        {recentUnique.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Recently read</Text>
            {recentUnique.map((entry) => (
              <Pressable
                key={`${entry.id}-${entry.viewed_at}`}
                onPress={() => {
                  if (entry.book_slug) {
                    openReader(entry.book_slug, entry.chapter);
                  }
                }}
              >
                <GlassCard style={styles.listRow}>
                  <Text style={styles.listRowTitle}>
                    {entry.book_name ?? "Scripture"} {entry.chapter}:{entry.verse}
                  </Text>
                  <Text style={styles.listRowMeta}>
                    {new Date(entry.viewed_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </GlassCard>
              </Pressable>
            ))}
          </View>
        ) : null}

        {bookmarkPreview.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Bookmarks</Text>
              <Pressable onPress={() => router.push("/(tabs)/workspace")} hitSlop={8}>
                <Text style={styles.sectionLink}>See all</Text>
              </Pressable>
            </View>
            {bookmarkPreview.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  if (item.book_slug) {
                    openReader(item.book_slug, item.chapter);
                  }
                }}
              >
                <GlassCard style={styles.listRow}>
                  <Text style={styles.listRowTitle}>
                    {item.book_name ?? "Scripture"} {item.chapter}:{item.verse}
                  </Text>
                  <Text style={styles.listRowSnippet} numberOfLines={2}>
                    {item.verse_text ?? ""}
                  </Text>
                </GlassCard>
              </Pressable>
            ))}
          </View>
        ) : null}

        <TopicGrid onTopicPress={openTopic} />

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search verses (local)"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchHint ? <Text style={styles.searchHint}>{searchHint}</Text> : null}

        {showSearch ? (
          <View>
            {searching ? (
              <ActivityIndicator color={colors.accent} style={styles.searchSpinner} />
            ) : null}
            {!searching && results.length === 0 ? (
              <View style={styles.emptySearch}>
                <Ionicons name="search-outline" size={32} color={colors.textMuted} />
                <Text style={styles.empty}>No verses matched “{debouncedQuery.trim()}”.</Text>
                <Text style={styles.emptySub}>Try different keywords or a shorter phrase.</Text>
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
              {TESTAMENTS.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setTestament(t)}
                  style={[styles.tab, testament === t && styles.tabActive]}
                >
                  <Text style={[styles.tabText, testament === t && styles.tabTextActive]}>
                    {t === "OT" ? "Old Testament" : "New Testament"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {loading ? (
              <ActivityIndicator color={colors.accent} style={styles.spinner} />
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
});

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@/components/GlassCard";
import { formatBookReference, getBookDisplayName } from "@/i18n/bookNames";
import * as highlightsRepo from "@/services/db/highlightsRepository";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import { useBookmarksStore } from "@/store/bookmarksStore";
import { useLocaleStore } from "@/store/localeStore";
import { useActiveTranslation } from "@/store/translationStore";
import { useVerseReviewStore } from "@/store/verseReviewStore";
import { colors, radii, spacing, typography } from "@/theme";
import { hapticLight, hapticSuccess } from "@/utils/haptics";

type ReviewSource = "bookmark" | "highlight";

interface ReviewItem {
  key: string;
  source: ReviewSource;
  bookSlug: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

function buildKey(bookSlug: string, chapter: number, verse: number): string {
  return `${bookSlug}-${chapter}-${verse}`;
}

export default function VerseReviewScreen() {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const translation = useActiveTranslation(locale);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const loadBookmarks = useBookmarksStore((s) => s.loadBookmarks);
  const records = useVerseReviewStore((s) => s.records);
  const reviewLoaded = useVerseReviewStore((s) => s.loaded);
  const loadReview = useVerseReviewStore((s) => s.load);
  const markRemembered = useVerseReviewStore((s) => s.markRemembered);
  const markReviewLater = useVerseReviewStore((s) => s.markReviewLater);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [index, setIndex] = useState(0);

  const loadItems = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadBookmarks(), loadReview()]);

    const next = new Map<string, ReviewItem>();
    for (const bookmark of useBookmarksStore.getState().bookmarks) {
      if (!bookmark.book_slug) {
        continue;
      }
      const key = buildKey(bookmark.book_slug, bookmark.chapter, bookmark.verse);
      next.set(key, {
        key,
        source: "bookmark",
        bookSlug: bookmark.book_slug,
        bookName: getBookDisplayName(bookmark.book_slug, locale, bookmark.book_name),
        chapter: bookmark.chapter,
        verse: bookmark.verse,
        text: bookmark.verse_text ?? t("common.textUnavailable"),
      });
    }

    const highlights = await highlightsRepo.listHighlightsWithReferences();
    for (const highlight of highlights) {
      const key = buildKey(highlight.book_slug, highlight.chapter, highlight.verse);
      if (next.has(key)) {
        continue;
      }
      const [book, verse] = await Promise.all([
        scriptureRepo.getBookBySlug(highlight.book_slug),
        scriptureRepo.getVerseByReference(
          highlight.book_slug,
          highlight.chapter,
          highlight.verse,
          translation
        ),
      ]);
      next.set(key, {
        key,
        source: "highlight",
        bookSlug: highlight.book_slug,
        bookName: getBookDisplayName(highlight.book_slug, locale, book?.name),
        chapter: highlight.chapter,
        verse: highlight.verse,
        text: verse?.text ?? t("common.textUnavailable"),
      });
    }

    setItems(Array.from(next.values()));
    setLoading(false);
  }, [loadBookmarks, loadReview, locale, t, translation]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const reviewItems = useMemo(() => {
    const due = items.filter((item) => {
      const record = records[item.key];
      if (!record) {
        return true;
      }
      return new Date(record.dueAt).getTime() <= Date.now();
    });
    return due.length > 0 ? due : items;
  }, [items, records]);

  useEffect(() => {
    if (index >= reviewItems.length) {
      setIndex(0);
    }
  }, [index, reviewItems.length]);

  const current = reviewItems[index] ?? null;

  const advance = useCallback(() => {
    setRevealed(false);
    setIndex((value) => (reviewItems.length === 0 ? 0 : (value + 1) % reviewItems.length));
  }, [reviewItems.length]);

  const handleRemembered = useCallback(async () => {
    if (!current) {
      return;
    }
    await markRemembered(current.key);
    void hapticSuccess();
    advance();
  }, [advance, current, markRemembered]);

  const handleLater = useCallback(async () => {
    if (!current) {
      return;
    }
    await markReviewLater(current.key);
    void hapticLight();
    advance();
  }, [advance, current, markReviewLater]);

  const openCurrentInReader = useCallback(() => {
    if (!current) {
      return;
    }
    router.push(`/reader/${current.bookSlug}/${current.chapter}?verse=${current.verse}`);
  }, [current, router]);

  if (loading || !reviewLoaded) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>{t("review.loading")}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.accent} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t("review.title")}</Text>
          <Text style={styles.subtitle}>{t("review.subtitle")}</Text>
        </View>
      </View>

      {!current ? (
        <GlassCard style={styles.emptyCard}>
          <Ionicons name="albums-outline" size={34} color={colors.accent} />
          <Text style={styles.emptyTitle}>{t("review.emptyTitle")}</Text>
          <Text style={styles.emptyBody}>{t("review.emptyBody")}</Text>
          <Pressable onPress={() => router.push("/(tabs)/workspace")} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{t("review.openWorkspace")}</Text>
          </Pressable>
        </GlassCard>
      ) : (
        <>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {t("review.progress", {
                current: index + 1,
                total: reviewItems.length,
              })}
            </Text>
            <Text style={styles.progressText}>
              {current.source === "bookmark"
                ? t("review.sourceBookmark")
                : t("review.sourceHighlight")}
            </Text>
          </View>

          <Pressable
            onPress={() => setRevealed(true)}
            style={styles.flashCard}
            accessibilityRole="button"
            accessibilityLabel={revealed ? t("review.cardRevealed") : t("review.reveal")}
          >
            <Text style={styles.reference}>
              {formatBookReference(
                current.bookSlug,
                current.chapter,
                current.verse,
                locale,
                current.bookName
              )}
            </Text>
            {revealed ? (
              <Text style={styles.verseText}>{current.text}</Text>
            ) : (
              <View style={styles.hiddenState}>
                <Ionicons name="eye-outline" size={24} color={colors.accent} />
                <Text style={styles.hiddenText}>{t("review.hiddenHint")}</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.actionRow}>
            <Pressable onPress={handleLater} style={[styles.actionBtn, styles.secondaryBtn]}>
              <Ionicons name="refresh-outline" size={16} color={colors.accent} />
              <Text style={styles.secondaryBtnText}>{t("review.reviewLater")}</Text>
            </Pressable>
            {revealed ? (
              <Pressable onPress={handleRemembered} style={[styles.actionBtn, styles.primaryBtn]}>
                <Ionicons name="checkmark" size={16} color={colors.canvas} />
                <Text style={styles.primaryBtnText}>{t("review.remembered")}</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setRevealed(true)}
                style={[styles.actionBtn, styles.primaryBtn]}
              >
                <Ionicons name="eye-outline" size={16} color={colors.canvas} />
                <Text style={styles.primaryBtnText}>{t("review.reveal")}</Text>
              </Pressable>
            )}
          </View>

          <Pressable onPress={openCurrentInReader} style={styles.readerLink}>
            <Ionicons name="book-outline" size={16} color={colors.accent} />
            <Text style={styles.readerLinkText}>{t("review.openInReader")}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.canvas,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.title,
    color: colors.accent,
    fontWeight: "800",
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  emptyCard: {
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "800",
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "700",
  },
  flashCard: {
    minHeight: 320,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  reference: {
    ...typography.subtitle,
    color: colors.accent,
    textAlign: "center",
    fontWeight: "800",
  },
  verseText: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 34,
  },
  hiddenState: {
    alignItems: "center",
    gap: spacing.sm,
  },
  hiddenText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  primaryBtnText: {
    ...typography.caption,
    color: colors.canvas,
    fontWeight: "800",
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.accentGlow,
  },
  secondaryBtnText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "800",
  },
  readerLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
    padding: spacing.md,
  },
  readerLinkText: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
    fontWeight: "700",
  },
});

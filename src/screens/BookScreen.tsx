import React, { useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getBookDisplayName } from "@/i18n/bookNames";
import { useLocaleStore } from "@/store/localeStore";
import { ChapterTile } from "@/components/ChapterTile";
import { ErrorFallback } from "@/components/ErrorFallback";
import { GlassChrome } from "@/components/GlassChrome";
import { LoadingState } from "@/components/layout/LoadingState";
import { useBook, useChapters, useDatabaseReady } from "@/hooks/useScripture";
import { colors, spacing, typography } from "@/theme";

const CHAPTER_TILE_SIZE = 64 + spacing.xs * 2;

export default function BookScreen() {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const bookSlug = typeof slug === "string" ? slug : "";
  const { ready, error, retry } = useDatabaseReady();
  const { book, loading: bookLoading } = useBook(bookSlug);
  const { chapters, loading: chaptersLoading } = useChapters(book?.id);

  const openChapter = useCallback(
    (chapterNumber: number) => {
      if (book) {
        router.push(`/reader/${book.slug}/${chapterNumber}`);
      }
    },
    [book, router]
  );

  const renderChapter = useCallback(
    ({ item }: { item: { id: number; number: number } }) => (
      <ChapterTile number={item.number} onPress={() => openChapter(item.number)} />
    ),
    [openChapter]
  );

  if (!ready || bookLoading || chaptersLoading) {
    return (
      <View style={styles.centered}>
        <LoadingState message={t("common.loading")} />
      </View>
    );
  }

  if (error) {
    return <ErrorFallback message={error} onRetry={retry} />;
  }

  if (!book) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{t("book.notFound")}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <GlassChrome style={styles.header}>
        <Text style={styles.title}>{getBookDisplayName(book.slug, locale, book.name)}</Text>
        <Text style={styles.meta}>{t("book.chaptersAvailable", { count: chapters.length })}</Text>
      </GlassChrome>

      <FlatList
        data={chapters}
        keyExtractor={(item) => String(item.id)}
        numColumns={4}
        contentContainerStyle={styles.list}
        renderItem={renderChapter}
        initialNumToRender={16}
        maxToRenderPerBatch={12}
        windowSize={5}
        getItemLayout={(_, index) => ({
          length: CHAPTER_TILE_SIZE,
          offset: CHAPTER_TILE_SIZE * Math.floor(index / 4),
          index,
        })}
        ListEmptyComponent={<Text style={styles.empty}>{t("book.noChapters")}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  error: {
    ...typography.body,
    color: colors.danger,
  },
});

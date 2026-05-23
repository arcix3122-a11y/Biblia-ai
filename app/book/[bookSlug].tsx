import React, { useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { getBookDisplayName } from "@/i18n/bookNames";
import { useLocaleStore } from "@/store/localeStore";
import { ChapterTile } from "@/components/ChapterTile";
import { ErrorFallback } from "@/components/ErrorFallback";
import { LoadingState } from "@/components/layout/LoadingState";
import { useBook, useChapters, useDatabaseReady } from "@/hooks/useScripture";
import { colors, spacing, typography } from "@/theme";

const CHAPTER_TILE_SIZE = 64 + spacing.xs * 2;

export default function BookChaptersRoute() {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const { bookSlug } = useLocalSearchParams<{ bookSlug: string }>();
  const slug = typeof bookSlug === "string" ? bookSlug : "";
  const router = useRouter();
  const { ready, error, retry } = useDatabaseReady();
  const { book, loading: bookLoading } = useBook(slug);
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
    <>
      <Stack.Screen
        options={{ title: getBookDisplayName(book.slug, locale, book.name) }}
      />
      <View style={styles.container}>
        <Text style={styles.subtitle}>
          {t("book.chaptersAvailable", { count: chapters.length })}
        </Text>
        <FlatList
          data={chapters}
          keyExtractor={(item) => String(item.id)}
          numColumns={4}
          contentContainerStyle={styles.grid}
          renderItem={renderChapter}
          initialNumToRender={16}
          maxToRenderPerBatch={12}
          windowSize={5}
          getItemLayout={(_, index) => ({
            length: CHAPTER_TILE_SIZE,
            offset: CHAPTER_TILE_SIZE * Math.floor(index / 4),
            index,
          })}
          ListEmptyComponent={<Text style={styles.empty}>{t("book.noChaptersImported")}</Text>}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  grid: {
    paddingBottom: spacing.xl,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  error: {
    ...typography.body,
    color: colors.danger,
  },
});

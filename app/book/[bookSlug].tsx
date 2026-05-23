import React from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChapterTile } from "@/components/ChapterTile";
import { useBook, useChapters, useDatabaseReady } from "@/hooks/useScripture";
import { colors, spacing, typography } from "@/theme";

export default function BookChaptersRoute() {
  const { t } = useTranslation();
  const { bookSlug } = useLocalSearchParams<{ bookSlug: string }>();
  const slug = typeof bookSlug === "string" ? bookSlug : "";
  const router = useRouter();
  const { ready, error } = useDatabaseReady();
  const { book, loading: bookLoading } = useBook(slug);
  const { chapters, loading: chaptersLoading } = useChapters(book?.id);

  if (!ready || bookLoading || chaptersLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error || !book) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? t("book.notFound")}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: book.name }} />
      <View style={styles.container}>
        <Text style={styles.subtitle}>
          {t("book.chaptersAvailable", { count: chapters.length })}
        </Text>
        <FlatList
          data={chapters}
          keyExtractor={(item) => String(item.id)}
          numColumns={4}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <ChapterTile
              number={item.number}
              onPress={() =>
                router.push(`/reader/${book.slug}/${item.number}`)
              }
            />
          )}
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

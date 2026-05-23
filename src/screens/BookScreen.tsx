import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChapterTile } from "@/components/ChapterTile";
import { GlassChrome } from "@/components/GlassChrome";
import { useBook, useChapters, useDatabaseReady } from "@/hooks/useScripture";
import { colors, spacing, typography } from "@/theme";

export default function BookScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const bookSlug = typeof slug === "string" ? slug : "";
  const { ready, error } = useDatabaseReady();
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
        <Text style={styles.error}>{error ?? "Book not found."}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <GlassChrome style={styles.header}>
        <Text style={styles.title}>{book.name}</Text>
        <Text style={styles.meta}>{chapters.length} chapters available locally</Text>
      </GlassChrome>

      <FlatList
        data={chapters}
        keyExtractor={(item) => String(item.id)}
        numColumns={4}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ChapterTile number={item.number} onPress={() => openChapter(item.number)} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No chapters seeded for this book yet.</Text>
        }
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

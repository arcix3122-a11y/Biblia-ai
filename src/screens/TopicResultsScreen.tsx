import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { getTopicBySlug } from "@/data/semanticTopics";
import { searchTopicVerses } from "@/services/db/semanticSearch";
import { colors, spacing, typography } from "@/theme";
import type { VerseWithReference } from "@/types/scripture";

export default function TopicResultsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const topicSlug = typeof slug === "string" ? slug : "";
  const topic = getTopicBySlug(topicSlug);
  const router = useRouter();
  const [results, setResults] = useState<VerseWithReference[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!topic) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const hits = await searchTopicVerses(topic);
    setResults(hits);
    setLoading(false);
  }, [topic]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: topic?.title ?? "Topic" }} />

      {topic ? (
        <Text style={styles.description}>{topic.description}</Text>
      ) : (
        <Text style={styles.description}>Topic not found.</Text>
      )}

      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.spinner} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No local verses matched this topic yet.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/reader/${item.book_slug}/${item.chapter_number}`)}
              style={styles.hit}
            >
              <Text style={styles.ref}>
                {item.book_name} {item.chapter_number}:{item.number}
              </Text>
              <Text style={styles.snippet} numberOfLines={3}>
                {item.text}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    padding: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  hit: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  ref: {
    ...typography.caption,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  snippet: {
    ...typography.body,
    color: colors.textPrimary,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  spinner: {
    marginTop: spacing.xl,
  },
});

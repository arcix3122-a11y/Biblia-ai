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
import { useTranslation } from "react-i18next";
import { formatBookReference } from "@/i18n/bookNames";
import { useLocaleStore } from "@/store/localeStore";
import { useActiveTranslation } from "@/store/translationStore";
import { getTopicBySlug } from "@/data/semanticTopics";
import { getTopicPhotoUrl } from "@/data/photoBackgrounds";
import { PhotoBackground } from "@/components/PhotoBackground";
import { useLocalizedTopic } from "@/hooks/useLocalizedTopic";
import { searchTopicVerses } from "@/services/db/semanticSearch";
import { colors, radii, spacing, typography } from "@/theme";
import type { VerseWithReference } from "@/types/scripture";

export default function TopicResultsScreen() {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const translation = useActiveTranslation(locale);
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const topicSlug = typeof slug === "string" ? slug : "";
  const topic = useLocalizedTopic(getTopicBySlug(topicSlug));
  const router = useRouter();
  const [results, setResults] = useState<VerseWithReference[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const rawTopic = getTopicBySlug(topicSlug);
    if (!rawTopic) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const hits = await searchTopicVerses(rawTopic, translation);
    setResults(hits);
    setLoading(false);
  }, [topicSlug, translation]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: topic?.title ?? t("stack.topic") }} />

      {topic ? (
        <PhotoBackground
          uri={getTopicPhotoUrl(topicSlug, 900, 200)}
          style={styles.hero}
          borderRadius={radii.lg}
          scrimOpacity={0.54}
        >
          <Text style={styles.heroTitle}>{topic.title}</Text>
          <Text style={styles.description}>{topic.description}</Text>
        </PhotoBackground>
      ) : (
        <Text style={styles.description}>{t("topic.notFound")}</Text>
      )}

      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.spinner} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>{t("topic.empty")}</Text>}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/reader/${item.book_slug}/${item.chapter_number}`)}
              style={styles.hit}
            >
              <Text style={styles.ref}>
                {formatBookReference(
                  item.book_slug,
                  item.chapter_number,
                  item.number,
                  locale,
                  item.book_name
                )}
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
    color: "rgba(255,255,255,0.82)",
  },
  hero: {
    marginBottom: spacing.md,
    padding: spacing.md,
    minHeight: 112,
    justifyContent: "flex-end",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  heroTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
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

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { PhotoBackground } from "@/components/PhotoBackground";
import { getTopicPhotoUrl } from "@/data/photoBackgrounds";
import { SEMANTIC_TOPICS } from "@/data/semanticTopics";
import { colors, radii, spacing, typography } from "@/theme";
import type { TopicGridProps } from "@/types/ui";

export function TopicGrid({ onTopicPress }: TopicGridProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{t("home.exploreByTopic")}</Text>
      <View style={styles.grid}>
        {SEMANTIC_TOPICS.map((topic) => (
          <Pressable
            key={topic.slug}
            onPress={() => onTopicPress(topic.slug)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <PhotoBackground
              uri={getTopicPhotoUrl(topic.slug, 480, 320)}
              style={StyleSheet.absoluteFill}
              borderRadius={radii.lg}
              scrimOpacity={0.56}
            />
            <Text style={styles.title}>
              {t(`topics.${topic.slug}.title`, { defaultValue: topic.title })}
            </Text>
            <Text style={styles.description} numberOfLines={2}>
              {t(`topics.${topic.slug}.description`, { defaultValue: topic.description })}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
  },
  heading: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  card: {
    width: "48%",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    minHeight: 104,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  cardPressed: {
    borderColor: colors.accent,
    opacity: 0.92,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.caption,
    color: "rgba(255,255,255,0.78)",
  },
});

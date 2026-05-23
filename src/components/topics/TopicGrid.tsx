import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SEMANTIC_TOPICS } from "@/data/semanticTopics";
import { colors, radii, spacing, typography } from "@/theme";
import type { TopicGridProps } from "@/types/ui";

export function TopicGrid({ onTopicPress }: TopicGridProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Explore by topic</Text>
      <View style={styles.grid}>
        {SEMANTIC_TOPICS.map((topic) => (
          <Pressable
            key={topic.slug}
            onPress={() => onTopicPress(topic.slug)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <Text style={styles.title}>{topic.title}</Text>
            <Text style={styles.description} numberOfLines={2}>
              {topic.description}
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
    backgroundColor: colors.tile,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    minHeight: 96,
  },
  cardPressed: {
    borderColor: colors.accent,
    backgroundColor: colors.cardHover,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.caption,
    color: colors.textMuted,
  },
});

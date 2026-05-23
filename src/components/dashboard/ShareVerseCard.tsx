import React, { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { STORY_HEIGHT, STORY_WIDTH } from "@/services/share/verseImageExporter";
import { colors, spacing, typography } from "@/theme";
import type { ShareVerseCardProps } from "@/types/ui";

export const ShareVerseCard = forwardRef<View, ShareVerseCardProps>(function ShareVerseCard(
  { reference, text, width = STORY_WIDTH, height = STORY_HEIGHT },
  ref
) {
  return (
    <View
      ref={ref}
      collapsable={false}
      style={[styles.card, { width, height }]}
    >
      <Text style={styles.text}>"{text}"</Text>
      <Text style={styles.reference}>— {reference}</Text>
      <Text style={styles.brand}>SolidCode · Biblia AI</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.xl * 2,
    paddingVertical: spacing.xxl * 2,
    justifyContent: "center",
  },
  text: {
    fontSize: 52,
    lineHeight: 72,
    letterSpacing: 0.4,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  reference: {
    fontSize: 36,
    fontWeight: "600",
    color: colors.accent,
    marginBottom: spacing.xxl,
  },
  brand: {
    ...typography.label,
    color: colors.textMuted,
    position: "absolute",
    bottom: spacing.xxl * 2,
    left: spacing.xl * 2,
    opacity: 0.55,
  },
});

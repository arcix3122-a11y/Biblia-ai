import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { colors, radii, spacing, typography } from "@/theme";
import type { ContextPillTemplateId, ContextPillsProps } from "@/types/ui";

const PILLS: readonly { id: ContextPillTemplateId; label: string }[] = [
  { id: "historical", label: "Explain historical context" },
  { id: "application", label: "Give a daily life application" },
  { id: "original-language", label: "Break down original Greek/Hebrew" },
];

export function ContextPills({ onSelectTemplate, disabled }: ContextPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {PILLS.map((pill) => (
        <Pressable
          key={pill.id}
          onPress={() => onSelectTemplate(pill.id)}
          disabled={disabled}
          style={[styles.pill, disabled && styles.pillDisabled]}
        >
          <Text style={styles.pillText}>{pill.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  pill: {
    backgroundColor: colors.tile,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  pillDisabled: {
    opacity: 0.45,
  },
  pillText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

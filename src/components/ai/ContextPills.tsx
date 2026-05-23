import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { colors, radii, spacing, typography } from "@/theme";
import type { ContextPillTemplateId, ContextPillsProps } from "@/types/ui";

const PILL_KEYS: readonly ContextPillTemplateId[] = [
  "historical",
  "application",
  "original-language",
];

function getPillLabel(templateId: ContextPillTemplateId, t: (key: any, options?: any) => string): string {
  if (templateId === "historical") {
    return t("ai.pillHistorical");
  }
  if (templateId === "application") {
    return t("ai.pillApplication");
  }
  return t("ai.pillOriginalLanguage");
}

export function ContextPills({ onSelectTemplate, disabled }: ContextPillsProps) {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {PILL_KEYS.map((pill) => (
        <Pressable
          key={pill}
          onPress={() => onSelectTemplate(pill)}
          disabled={disabled}
          style={[styles.pill, disabled && styles.pillDisabled]}
        >
          <Text style={styles.pillText}>{getPillLabel(pill, t)}</Text>
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

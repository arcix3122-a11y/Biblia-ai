import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSeedProgressStore } from "@/store/seedProgressStore";
import { colors, radii, spacing, typography } from "@/theme";

export function ScriptureImportScreen() {
  const { t } = useTranslation();
  const percent = useSeedProgressStore((s) => s.percent);
  const phase = useSeedProgressStore((s) => s.phase);

  const phaseLabel =
    phase === "books"
      ? t("common.scriptureImportBooks")
      : phase === "verses" || phase === "preparing"
        ? t("common.scriptureImportVerses")
        : t("common.scriptureImportTitle");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("common.scriptureImportTitle")}</Text>
      <Text style={styles.subtitle}>{phaseLabel}</Text>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${percent}%` as `${number}%` }]} />
      </View>
      <Text style={styles.percent}>{t("common.scriptureImportPercent", { percent })}</Text>
      <Text style={styles.hint}>{t("common.scriptureImportHint")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  progressBarBg: {
    width: "100%",
    maxWidth: 320,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.backgroundElevated,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
  },
  percent: {
    ...typography.subtitle,
    color: colors.accent,
    marginBottom: spacing.lg,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 300,
  },
});

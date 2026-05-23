import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useReaderStore } from "@/store/readerStore";
import { FontControls } from "@/components/reader/FontControls";
import { GlassCard } from "@/components/GlassCard";
import { colors, radii, spacing, typography } from "@/theme";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { fontSize, increaseFont, decreaseFont, immersiveMode, toggleImmersiveMode } =
    useReaderStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t("settings.language")}</Text>
        <Text style={styles.hint}>{t("settings.languageHint")}</Text>
        <LanguageSwitcher />
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t("settings.appearance")}</Text>
        <Text style={styles.note}>{t("settings.appearanceNote")}</Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t("settings.readerFontSize")}</Text>
        <Text style={styles.hint}>{t("settings.readerFontHint")}</Text>
        <View style={styles.fontRow}>
          <FontControls
            fontSize={fontSize}
            onIncrease={increaseFont}
            onDecrease={decreaseFont}
            previewText={t("reader.fontPreview")}
          />
        </View>
        <Text style={styles.meta}>{t("settings.currentSize", { size: fontSize })}</Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t("settings.immersiveReading")}</Text>
        <Text style={styles.hint}>{t("settings.immersiveHint")}</Text>
        <Pressable onPress={toggleImmersiveMode} style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>
            {t("settings.immersiveMode", {
              state: immersiveMode ? t("common.on") : t("common.off"),
            })}
          </Text>
          <View style={[styles.pill, immersiveMode && styles.pillOn]}>
            <View style={[styles.knob, immersiveMode && styles.knobOn]} />
          </View>
        </Pressable>
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  note: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  fontRow: {
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.md,
  },
  pill: {
    width: 52,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 3,
    justifyContent: "center",
  },
  pillOn: {
    backgroundColor: colors.accentGlow,
    borderColor: colors.accent,
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.textMuted,
  },
  knobOn: {
    alignSelf: "flex-end",
    backgroundColor: colors.accent,
  },
});

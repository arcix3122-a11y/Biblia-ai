import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useReaderStore } from "@/store/readerStore";
import { useAiChatStore } from "@/store/aiChatStore";
import { useSpiritualAssistant } from "@/hooks/useSpiritualAssistant";
import { FontControls } from "@/components/reader/FontControls";
import { GlassCard } from "@/components/GlassCard";
import { colors, radii, spacing, typography } from "@/theme";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { fontSize, increaseFont, decreaseFont, immersiveMode, toggleImmersiveMode } =
    useReaderStore();
  const resetChat = useAiChatStore((s) => s.resetChat);

  const { hasApiKey, provider, model, endpoint, remaining, limit } = useSpiritualAssistant();

  const handleResetQuota = () => {
    Alert.alert(t("settings.resetQuotaTitle"), t("settings.resetQuotaMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.clear"),
        style: "destructive",
        onPress: () => {
          resetChat();
          Alert.alert(t("common.success"), t("settings.resetQuotaSuccess"));
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Language Section */}
      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t("settings.language")}</Text>
        <Text style={styles.hint}>{t("settings.languageHint")}</Text>
        <LanguageSwitcher />
      </GlassCard>

      {/* Reader Font Size Section */}
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

      {/* Immersive Reading Section */}
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

      {/* AI Companion Section */}
      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t("settings.aiService")}</Text>
        <Text style={styles.hint}>{t("settings.aiServiceHint")}</Text>

        <View style={styles.aiStatusContainer}>
          <View style={styles.aiStatusRow}>
            <View style={[styles.statusDot, hasApiKey ? styles.statusDotOn : styles.statusDotOff]} />
            <Text style={[styles.aiStatusText, { color: hasApiKey ? colors.accent : colors.textMuted }]}>
              {hasApiKey ? t("settings.aiStatusConfigured") : t("settings.aiStatusMissing")}
            </Text>
          </View>

          {hasApiKey ? (
            <View style={styles.aiDetails}>
              <Text style={styles.aiDetailText}>
                {t("settings.aiProviderValue", { value: provider })}
              </Text>
              <Text style={styles.aiDetailText}>
                {t("settings.aiModelValue", { value: model })}
              </Text>
              {endpoint ? (
                <Text style={styles.aiDetailText} numberOfLines={1}>
                  {t("settings.aiEndpointValue", { value: endpoint })}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Quota Progress */}
          <View style={styles.quotaSection}>
            <View style={styles.quotaHeader}>
              <Text style={styles.quotaTitle}>
                {t("ai.responsesRemaining", { remaining: remaining(), limit })}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, (remaining() / limit) * 100)}%` },
                ]}
              />
            </View>
          </View>

          {/* Reset Button */}
          <Pressable onPress={handleResetQuota} style={styles.resetButton}>
            <Ionicons name="refresh-outline" size={16} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={styles.resetButtonText}>{t("ai.clearChat")}</Text>
          </Pressable>
        </View>
      </GlassCard>

      {/* Scripture Translation Section */}
      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t("settings.scriptureTranslation")}</Text>
        <Text style={styles.note}>{t("settings.scriptureTranslationHint")}</Text>
      </GlassCard>

      {/* Appearance Section */}
      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t("settings.appearance")}</Text>
        <Text style={styles.note}>{t("settings.appearanceNote")}</Text>
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
  aiStatusContainer: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  aiStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textMuted,
  },
  statusDotOn: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  statusDotOff: {
    backgroundColor: colors.danger,
  },
  aiStatusText: {
    ...typography.body,
    fontWeight: "600",
  },
  aiDetails: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.md,
    gap: spacing.xs,
  },
  aiDetailText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  quotaSection: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  quotaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quotaTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.inputBackground,
    borderRadius: radii.pill,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  resetButtonText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "600",
  },
});

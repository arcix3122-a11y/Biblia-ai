import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Accordion } from "@/components/layout/Accordion";
import { useReaderStore } from "@/store/readerStore";
import { useAiChatStore } from "@/store/aiChatStore";
import {
  buildLlmApiConfig,
  checkLlmConnection,
} from "@/services/ai/llmClient";
import { useSpiritualAssistant } from "@/hooks/useSpiritualAssistant";
import { FontControls } from "@/components/reader/FontControls";
import { GlassCard } from "@/components/GlassCard";
import { getUserStats, setDailyGoal } from "@/services/stats/userStats";
import { getLastSyncAt } from "@/services/sync/syncEngine";
import { getSupabaseClient } from "@/services/supabase/supabaseClient";
import { formatNoteDate } from "@/utils/formatDate";
import { useLocaleStore } from "@/store/localeStore";
import { useTranslationStore } from "@/store/translationStore";
import type { TranslationPreference } from "@/types/scripture";
import { resetDatabaseForDev, resetDatabaseInit } from "@/services/db/database";
import { colors, radii, spacing, typography } from "@/theme";
import { useReminderStore } from "@/store/reminderStore";
import { requestNotificationPermission, scheduleDailyReminder, cancelDailyReminder } from "@/services/notifications/reminderService";
import { EcosystemModal } from "@/components/EcosystemModal";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const translationPreference = useTranslationStore((s) => s.preference);
  const setTranslationPreference = useTranslationStore((s) => s.setPreference);
  const supabaseConfigured = Boolean(getSupabaseClient());
  const { fontSize, increaseFont, decreaseFont, immersiveMode, toggleImmersiveMode } =
    useReaderStore();
  const resetChat = useAiChatStore((s) => s.resetChat);
  const limit = useAiChatStore((s) => s.limit);
  const messageCount = useAiChatStore((s) => s.messageCount);
  const remainingCount = Math.max(0, limit - messageCount);

  const { hasApiKey, provider, model, endpoint } = useSpiritualAssistant();
  const [health, setHealth] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [dailyGoal, setDailyGoalState] = useState(1);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [ecosystemVisible, setEcosystemVisible] = useState(false);

  useEffect(() => {
    void getUserStats().then((stats) => setDailyGoalState(stats.dailyGoal));
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) {
      return;
    }
    void getLastSyncAt().then(setLastSyncAt);
  }, [supabaseConfigured]);

  const adjustDailyGoal = useCallback(
    (delta: number) => {
      const next = Math.min(5, Math.max(1, dailyGoal + delta));
      void setDailyGoal(next).then((stats) => setDailyGoalState(stats.dailyGoal));
    },
    [dailyGoal]
  );

  const { enabled: reminderEnabled, hour, minute, setEnabled, setTime, load: loadReminder } = useReminderStore();

  useEffect(() => {
    void loadReminder();
  }, [loadReminder]);

  const handleToggleReminder = useCallback(async () => {
    if (!reminderEnabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(t("settings.notifications"), t("settings.notificationsPermissionDenied"));
        return;
      }
      const paddedMin = String(minute).padStart(2, "0");
      await scheduleDailyReminder(hour, minute, t("common.appName"), t("settings.notificationsHint"));
      setEnabled(true);
      Alert.alert(t("settings.notifications"), t("settings.notificationsScheduled", { hour, minute: paddedMin }));
    } else {
      await cancelDailyReminder();
      setEnabled(false);
    }
  }, [reminderEnabled, hour, minute, setEnabled, t]);

  const handleHourChange = useCallback(async (delta: number) => {
    const newHour = (hour + delta + 24) % 24;
    setTime(newHour, minute);
    if (reminderEnabled) {
      const paddedMin = String(minute).padStart(2, "0");
      await scheduleDailyReminder(newHour, minute, t("common.appName"), t("settings.notificationsHint"));
      Alert.alert(t("settings.notifications"), t("settings.notificationsScheduled", { hour: newHour, minute: paddedMin }));
    }
  }, [hour, minute, reminderEnabled, setTime, t]);

  const healthLabel = useMemo(() => {
    if (health === "checking") {
      return t("settings.aiHealthChecking");
    }
    if (health === "ok") {
      return t("settings.aiHealthOk");
    }
    return t("settings.aiHealthError");
  }, [health, t]);

  const runHealthCheck = useCallback(async () => {
    if (!hasApiKey) {
      setHealth("error");
      return;
    }

    setHealth("checking");

    try {
      const config = buildLlmApiConfig();
      const ok = await checkLlmConnection(config);
      setHealth(ok ? "ok" : "error");
    } catch {
      setHealth("error");
    }
  }, [hasApiKey]);

  useEffect(() => {
    if (!advancedOpen || !hasApiKey) {
      return;
    }
    void runHealthCheck();
  }, [advancedOpen, hasApiKey, runHealthCheck]);

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

  const handleClearLibrary = () => {
    Alert.alert(t("settings.clearLibraryTitle"), t("settings.clearLibraryMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.clearLibraryConfirm"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await resetDatabaseForDev();
              resetDatabaseInit();
              Alert.alert(t("common.success"), t("settings.clearLibrarySuccess"));
            } catch {
              Alert.alert(t("errors.somethingWrong"), t("errors.generic"));
            }
          })();
        },
      },
    ]);
  };

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const buildNumber = Constants.nativeBuildVersion ?? null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.groupHeading}>{t("settings.basic")}</Text>

      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t("settings.language")}</Text>
        <Text style={styles.hint}>{t("settings.languageHint")}</Text>
        <LanguageSwitcher />
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t("settings.translation.title")}</Text>
        <Text style={styles.hint}>{t("settings.translation.hint")}</Text>
        <View style={styles.translationRow}>
          {(["auto", "pl", "en"] as TranslationPreference[]).map((option) => {
            const active = translationPreference === option;
            const labelKey =
              option === "auto"
                ? "settings.translation.auto"
                : option === "pl"
                  ? "settings.translation.pl"
                  : "settings.translation.en";
            return (
              <Pressable
                key={option}
                onPress={() => setTranslationPreference(option)}
                style={[styles.translationChip, active && styles.translationChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.translationChipText, active && styles.translationChipTextActive]}>
                  {t(labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
        <Text style={styles.sectionTitle}>{t("settings.dailyReadingGoal")}</Text>
        <Text style={styles.hint}>{t("settings.dailyReadingGoalHint")}</Text>
        <View style={styles.goalRow}>
          <Pressable
            onPress={() => adjustDailyGoal(-1)}
            style={styles.goalButton}
            accessibilityLabel={t("settings.decreaseGoal")}
          >
            <Text style={styles.goalButtonText}>−</Text>
          </Pressable>
          <Text style={styles.goalValue}>
            {t("settings.chaptersPerDay", { count: dailyGoal })}
          </Text>
          <Pressable
            onPress={() => adjustDailyGoal(1)}
            style={styles.goalButton}
            accessibilityLabel={t("settings.increaseGoal")}
          >
            <Text style={styles.goalButtonText}>+</Text>
          </Pressable>
        </View>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t("settings.notifications")}</Text>
        <Text style={styles.hint}>{t("settings.notificationsHint")}</Text>
        <Pressable onPress={() => void handleToggleReminder()} style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>
            {reminderEnabled ? t("settings.notificationsEnabled") : t("settings.notificationsDisabled")}
          </Text>
          <View style={[styles.pill, reminderEnabled && styles.pillOn]}>
            <View style={[styles.knob, reminderEnabled && styles.knobOn]} />
          </View>
        </Pressable>
        {reminderEnabled ? (
          <View style={styles.timeRow}>
            <Pressable onPress={() => void handleHourChange(-1)} style={styles.timeBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={20} color={colors.accent} />
            </Pressable>
            <Text style={styles.timeLabel}>
              {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
            </Text>
            <Pressable onPress={() => void handleHourChange(1)} style={styles.timeBtn} hitSlop={10}>
              <Ionicons name="chevron-forward" size={20} color={colors.accent} />
            </Pressable>
          </View>
        ) : null}
      </GlassCard>

      <GlassCard style={styles.card}>
        <Accordion
          title={t("settings.advanced")}
          hint={t("settings.advancedHint")}
          onExpandedChange={(open) => {
            setAdvancedOpen(open);
            if (open && hasApiKey) {
              void runHealthCheck();
            }
          }}
        >
          <GlassCard style={styles.nestedCard}>
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

          <GlassCard style={styles.nestedCard}>
            <Text style={styles.sectionTitle}>{t("settings.aiCompanionStatus")}</Text>
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

                  <View style={styles.healthRow}>
                    <View
                      style={[
                        styles.healthDot,
                        health === "ok"
                          ? styles.healthDotOk
                          : health === "checking"
                            ? styles.healthDotChecking
                            : styles.healthDotError,
                      ]}
                    />
                    <Text style={styles.aiDetailText}>{healthLabel}</Text>
                    <Pressable onPress={() => void runHealthCheck()} style={styles.healthRefresh}>
                      <Ionicons name="refresh" size={14} color={colors.accent} />
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <View style={styles.quotaSection}>
                <Text style={styles.quotaTitle}>
                  {t("ai.responsesRemaining", { remaining: remainingCount, limit })}
                </Text>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(100, (remainingCount / limit) * 100)}%` },
                    ]}
                  />
                </View>
              </View>

              <Pressable onPress={handleResetQuota} style={styles.resetButton}>
                <Ionicons name="refresh-outline" size={16} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={styles.resetButtonText}>{t("ai.clearChat")}</Text>
              </Pressable>
            </View>
          </GlassCard>

          {supabaseConfigured ? (
            <GlassCard style={styles.nestedCard}>
              <Text style={styles.sectionTitle}>{t("settings.cloudSync")}</Text>
              <Text style={styles.hint}>{t("settings.cloudSyncHint")}</Text>
              <Text style={styles.meta}>
                {lastSyncAt
                  ? t("settings.lastSyncAt", { time: formatNoteDate(lastSyncAt, locale) })
                  : t("settings.lastSyncNever")}
              </Text>
            </GlassCard>
          ) : null}

          <GlassCard style={styles.nestedCard}>
            <Text style={styles.sectionTitle}>{t("settings.ecosystem")}</Text>
            <Text style={styles.hint}>{t("settings.ecosystemHint")}</Text>
            <Pressable
              onPress={() => setEcosystemVisible(true)}
              style={styles.ecosystemButton}
            >
              <Ionicons name="apps-outline" size={16} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={styles.ecosystemButtonText}>{t("settings.ecosystemView")}</Text>
            </Pressable>
          </GlassCard>

          <GlassCard style={styles.nestedCard}>
            <Text style={styles.sectionTitle}>{t("settings.about")}</Text>
            <Text style={styles.meta}>{t("settings.appVersion", { version: appVersion })}</Text>
            {buildNumber ? (
              <Text style={styles.meta}>{t("settings.buildNumber", { build: buildNumber })}</Text>
            ) : null}
          </GlassCard>

          <GlassCard style={styles.nestedCard}>
            <Text style={styles.sectionTitle}>{t("settings.appearance")}</Text>
            <Text style={styles.note}>{t("settings.appearanceNote")}</Text>
          </GlassCard>

          <GlassCard style={styles.nestedCard}>
            <Text style={styles.sectionTitle}>{t("settings.clearLibraryData")}</Text>
            <Text style={styles.hint}>{t("settings.advancedHint")}</Text>
            <Pressable onPress={handleClearLibrary} style={styles.dangerButton}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} style={{ marginRight: 6 }} />
              <Text style={styles.dangerButtonText}>{t("settings.clearLibraryData")}</Text>
            </Pressable>
          </GlassCard>
        </Accordion>
      </GlassCard>

      <EcosystemModal visible={ecosystemVisible} onClose={() => setEcosystemVisible(false)} />
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
  groupHeading: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: -spacing.xs,
  },
  card: {
    padding: spacing.md,
  },
  nestedCard: {
    padding: spacing.md,
    backgroundColor: colors.backgroundElevated,
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
  translationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  translationChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.inputBackground,
  },
  translationChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentGlow,
  },
  translationChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  translationChipTextActive: {
    color: colors.accent,
    fontWeight: "600",
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
  healthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  healthDotOk: {
    backgroundColor: "#22c55e",
  },
  healthDotChecking: {
    backgroundColor: "#f59e0b",
  },
  healthDotError: {
    backgroundColor: colors.danger,
  },
  healthRefresh: {
    marginLeft: "auto",
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
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
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  advancedToggleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  advancedPanel: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  goalButton: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundElevated,
  },
  goalButtonText: {
    ...typography.subtitle,
    color: colors.accent,
  },
  goalValue: {
    ...typography.body,
    color: colors.textPrimary,
    minWidth: 140,
    textAlign: "center",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  timeBtn: {
    padding: spacing.xs,
  },
  timeLabel: {
    ...typography.hero,
    color: colors.accent,
    fontWeight: "700",
    minWidth: 72,
    textAlign: "center",
  },
  ecosystemButton: {
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
  ecosystemButtonText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "600",
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  dangerButtonText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: "600",
  },
});

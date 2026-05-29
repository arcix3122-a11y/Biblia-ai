import React, { useCallback, useEffect, useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PhotoBackground } from "@/components/PhotoBackground";
import { GlassCard } from "@/components/GlassCard";
import { getPractice, getPracticeStepPreviews, isPracticeId } from "@/data/practices";
import { getCategoryPhotoUrl } from "@/data/photoBackgrounds";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import { usePracticeAudio } from "@/hooks/usePracticeAudio";
import {
  requestNotificationPermission,
  schedulePracticeReminder,
} from "@/services/notifications/reminderService";
import { useReminderStore } from "@/store/reminderStore";
import { useFastingPlanStore } from "@/store/fastingPlanStore";
import { useRosaryStore } from "@/store/rosaryStore";
import { useStationsStore } from "@/store/stationsStore";
import { hydratePracticeProgressStores, usePracticesStore } from "@/store/practicesStore";
import { colors, radii, spacing, typography } from "@/theme";

const REMINDER_OPTIONS = [
  { hour: 7, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 19, minute: 30 },
] as const;

export default function PracticeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, locale } = useAppTranslation();

  const practice = useMemo(() => (isPracticeId(id) ? getPractice(id) : undefined), [id]);

  const loaded = usePracticesStore((s) => s.loaded);
  const streakCount = usePracticesStore((s) => s.streakCount);
  const practiceReminderEnabled = usePracticesStore((s) => s.practiceReminderEnabled);
  const setActivePractice = usePracticesStore((s) => s.setActivePractice);
  const setPracticeReminderEnabled = usePracticesStore((s) => s.setPracticeReminderEnabled);
  const getProgressPercent = usePracticesStore((s) => s.getProgressPercent);
  const isPracticeStarted = usePracticesStore((s) => s.isPracticeStarted);

  const fastingCompletedLen = useFastingPlanStore((s) => s.completedDays.length);
  const fastingStart = useFastingPlanStore((s) => s.startDate);
  const stationsCompletedLen = useStationsStore((s) => s.completedStations.length);
  const stationsStart = useStationsStore((s) => s.startDate);
  const rosaryDecade = useRosaryStore((s) => s.currentDecade);
  const rosaryBeads = useRosaryStore((s) => s.beadCount);
  const rosaryStart = useRosaryStore((s) => s.startDate);

  const reminderHour = useReminderStore((s) => s.hour);
  const reminderMinute = useReminderStore((s) => s.minute);
  const setReminderTime = useReminderStore((s) => s.setTime);
  const setReminderEnabled = useReminderStore((s) => s.setEnabled);

  const { speak, stop } = usePracticeAudio(locale);

  useEffect(() => {
    void hydratePracticeProgressStores();
  }, []);

  useEffect(() => {
    if (practice) {
      void setActivePractice(practice.id);
    }
    return () => {
      stop();
    };
  }, [practice, setActivePractice, stop]);

  const stepPreviews = useMemo(
    () => (practice ? getPracticeStepPreviews(practice.id) : []),
    [practice]
  );

  const progress = useMemo(() => {
    if (!practice) {
      return 0;
    }
    void fastingCompletedLen;
    void fastingStart;
    void stationsCompletedLen;
    void stationsStart;
    void rosaryDecade;
    void rosaryBeads;
    void rosaryStart;
    return getProgressPercent(practice.id);
  }, [
    practice,
    getProgressPercent,
    fastingCompletedLen,
    fastingStart,
    stationsCompletedLen,
    stationsStart,
    rosaryDecade,
    rosaryBeads,
    rosaryStart,
  ]);

  const started = useMemo(() => {
    if (!practice) {
      return false;
    }
    return isPracticeStarted(practice.id);
  }, [practice, isPracticeStarted, fastingStart, stationsStart, rosaryStart]);

  const handleScheduleReminder = useCallback(
    async (hour: number, minute: number) => {
      if (!practice) {
        return;
      }

      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(t("practices.reminderDeniedTitle"), t("practices.reminderDeniedBody"));
        return;
      }

      await schedulePracticeReminder(
        practice.id,
        hour,
        minute,
        t("common.appName"),
        t("practices.reminderBody", { practice: t(practice.titleKey) })
      );
      setReminderTime(hour, minute);
      setReminderEnabled(true);
      await setPracticeReminderEnabled(true);
      Alert.alert(
        t("practices.reminderScheduledTitle"),
        t("practices.reminderScheduledBody", {
          hour: hour.toString().padStart(2, "0"),
          minute: minute.toString().padStart(2, "0"),
        })
      );
    },
    [practice, setPracticeReminderEnabled, setReminderEnabled, setReminderTime, t]
  );

  const handleStartOrContinue = useCallback(() => {
    if (!practice) {
      return;
    }
    router.push({ pathname: "/practice/[id]/session", params: { id: practice.id } });
  }, [practice, router]);

  if (!practice) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{t("practices.notFound")}</Text>
        <Pressable onPress={() => router.back()} style={styles.linkBtn}>
          <Text style={styles.linkBtnText}>{t("common.back")}</Text>
        </Pressable>
      </View>
    );
  }

  if (!loaded) {
    return null;
  }

  const photoUrl = getCategoryPhotoUrl(practice.imageCategory, 900, 520);
  const previewSteps = stepPreviews.slice(0, 6);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.accent} />
        </Pressable>
      </View>

      <PhotoBackground uri={photoUrl} style={styles.hero} borderRadius={radii.xl}>
        <View style={styles.heroInner}>
          <Text style={styles.category}>{t(practice.categoryLabelKey)}</Text>
          <Text style={styles.heroTitle}>{t(practice.titleKey)}</Text>
          <Text style={styles.heroSubtitle}>{t(practice.subtitleKey)}</Text>
          <Text style={styles.heroMeta}>
            {t("practices.meta", {
              steps: practice.stepCount,
              minutes: practice.durationMinutes,
            })}
          </Text>
        </View>
      </PhotoBackground>

      <GlassCard style={styles.card}>
        <Text style={styles.body}>{t(practice.descriptionKey)}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Ionicons name="flame-outline" size={16} color={colors.accent} />
            <Text style={styles.statText}>{t("practices.streak", { count: streakCount })}</Text>
          </View>
          <View style={styles.statChip}>
            <Ionicons name="analytics-outline" size={16} color={colors.accent} />
            <Text style={styles.statText}>{t("practices.progress", { percent: progress })}</Text>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress}%` as `${number}%` }]} />
        </View>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t("practices.stepsPreviewTitle")}</Text>
        <Text style={styles.sectionHint}>{t("practices.stepsPreviewHint", { total: practice.stepCount })}</Text>
        {previewSteps.map((step) => (
          <View key={step.index} style={styles.stepRow}>
            <Text style={styles.stepIndex}>{step.index}</Text>
            <Text style={styles.stepLabel}>
              {practice.id === "stations"
                ? t("practices.steps.stations.station", { number: step.index })
                : practice.id === "fasting"
                  ? t("practices.steps.fasting.day", { day: step.index })
                  : t("practices.steps.rosary.decade", { decade: step.index })}
            </Text>
          </View>
        ))}
        {practice.stepCount > previewSteps.length ? (
          <Text style={styles.moreSteps}>
            {t("practices.stepsMore", { count: practice.stepCount - previewSteps.length })}
          </Text>
        ) : null}
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>{t("practices.reminderTitle")}</Text>
        <Text style={styles.sectionHint}>{t("practices.reminderHint")}</Text>
        {practiceReminderEnabled ? (
          <Text style={styles.reminderOn}>{t("practices.reminderOn")}</Text>
        ) : null}
        <View style={styles.reminderRow}>
          {REMINDER_OPTIONS.map((opt) => {
            const selected =
              practiceReminderEnabled && reminderHour === opt.hour && reminderMinute === opt.minute;
            return (
              <Pressable
                key={`${opt.hour}-${opt.minute}`}
                onPress={() => void handleScheduleReminder(opt.hour, opt.minute)}
                style={[styles.reminderChip, selected && styles.reminderChipSelected]}
              >
                <Text style={[styles.reminderChipText, selected && styles.reminderChipTextSelected]}>
                  {`${opt.hour.toString().padStart(2, "0")}:${opt.minute.toString().padStart(2, "0")}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      <View style={styles.actions}>
        <Pressable onPress={() => void speak(t(practice.descriptionKey))} style={styles.secondaryBtn}>
          <Ionicons name="volume-high-outline" size={18} color={colors.accent} />
          <Text style={styles.secondaryBtnText}>{t("practices.listenDescription")}</Text>
        </Pressable>
        <Pressable onPress={handleStartOrContinue} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>
            {started ? t("practices.continueSession") : t("practices.startSession")}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.md, gap: spacing.md },
  centered: { justifyContent: "center", alignItems: "center", padding: spacing.lg },
  header: { flexDirection: "row", alignItems: "center" },
  backBtn: { padding: spacing.xs },
  hero: { minHeight: 200 },
  heroInner: { padding: spacing.lg, gap: spacing.xs },
  category: { ...typography.caption, color: colors.accent, fontWeight: "700", textTransform: "uppercase" },
  heroTitle: { ...typography.title, color: colors.textPrimary, fontWeight: "800" },
  heroSubtitle: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  heroMeta: { ...typography.caption, color: colors.textMuted },
  card: { padding: spacing.md, gap: spacing.sm },
  body: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  statText: { ...typography.caption, color: colors.textPrimary },
  progressBarBg: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.inputBackground,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  progressBarFill: { height: "100%", backgroundColor: colors.accent, borderRadius: radii.pill },
  sectionTitle: { ...typography.subtitle, color: colors.textPrimary, fontWeight: "700" },
  sectionHint: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  stepIndex: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "800",
    width: 28,
    textAlign: "center",
  },
  stepLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  moreSteps: { ...typography.caption, color: colors.textMuted, fontStyle: "italic" },
  reminderRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  reminderChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  reminderChipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  reminderChipText: { ...typography.caption, color: colors.textPrimary },
  reminderChipTextSelected: { color: colors.canvas, fontWeight: "700" },
  reminderOn: { ...typography.caption, color: colors.accent },
  actions: { gap: spacing.sm },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryBtnText: { ...typography.subtitle, color: colors.canvas, fontWeight: "700" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  secondaryBtnText: { ...typography.caption, color: colors.accent, fontWeight: "600" },
  errorText: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  linkBtn: { marginTop: spacing.md, padding: spacing.sm },
  linkBtnText: { ...typography.caption, color: colors.accent },
});

import React, { useEffect, useCallback } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { getBookDisplayName } from "@/i18n/bookNames";
import { useLocaleStore } from "@/store/localeStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useYearPlanStore } from "@/store/yearPlanStore";
import { getAssignmentsForDay } from "@/data/readingPlan";
import type { DayAssignment } from "@/data/readingPlan";
import { GlassCard } from "@/components/GlassCard";
import { colors, radii, spacing, typography } from "@/theme";

export default function ReadingPlanScreen() {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    startDate,
    loaded,
    load,
    startPlan,
    resetPlan,
    markDayComplete,
    isDayComplete,
    getCurrentDay,
    getProgress,
    completedDays,
  } = useYearPlanStore();

  useEffect(() => {
    void load();
  }, [load]);

  const currentDay = getCurrentDay();
  const progress = getProgress();
  const todayAssignments = getAssignmentsForDay(currentDay);
  const todayDone = isDayComplete(currentDay);

  const handleStart = useCallback(async () => {
    await startPlan();
  }, [startPlan]);

  const handleMarkDone = useCallback(async () => {
    await markDayComplete(currentDay);
  }, [currentDay, markDayComplete]);

  const handleReset = useCallback(() => {
    Alert.alert(t("plan.resetConfirmTitle"), t("plan.resetConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("plan.resetPlan"), style: "destructive", onPress: () => void resetPlan() },
    ]);
  }, [resetPlan, t]);

  const openChapter = useCallback(
    (bookSlug: string, chapter: number) => {
      router.push(`/reader/${bookSlug}/${chapter}`);
    },
    [router]
  );

  if (!loaded) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.accent} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t("plan.title")}</Text>
          <Text style={styles.subtitle}>{t("plan.subtitle")}</Text>
        </View>
      </View>

      {!startDate ? (
        /* Not started */
        <GlassCard style={styles.card}>
          <Ionicons name="calendar-outline" size={40} color={colors.accent} style={styles.icon} />
          <Text style={styles.notStartedText}>{t("plan.notStarted")}</Text>
          <Text style={styles.hintText}>{t("plan.startHint")}</Text>
          <Pressable onPress={() => void handleStart()} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{t("plan.startPlan")}</Text>
          </Pressable>
        </GlassCard>
      ) : (
        <>
          {/* Progress */}
          <GlassCard style={styles.card}>
            <Text style={styles.dayLabel}>{t("plan.dayLabel", { day: currentDay })}</Text>
            <Text style={styles.progressPercent}>{t("plan.progressLabel", { percent: progress })}</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` as `${number}%` }]} />
            </View>
            <Text style={styles.metaText}>
              {t("plan.completedDays", { count: completedDays.length })}
            </Text>
          </GlassCard>

          {/* Today's Reading */}
          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>{t("plan.todayAssignment")}</Text>
            {todayAssignments.length === 0 ? (
              <Text style={styles.emptyText}>{t("plan.noAssignment")}</Text>
            ) : (
              <FlatList
                data={todayAssignments}
                scrollEnabled={false}
                keyExtractor={(item) => `${item.bookSlug}-${item.chapter}`}
                renderItem={({ item }: { item: DayAssignment }) => (
                  <Pressable
                    onPress={() => openChapter(item.bookSlug, item.chapter)}
                    style={styles.chapterRow}
                  >
                    <Ionicons name="book-outline" size={16} color={colors.accent} />
                    <Text style={styles.chapterText}>
                      {t("plan.chapterLabel", {
                        book: getBookDisplayName(item.bookSlug, locale, item.bookName),
                        chapter: item.chapter,
                      })}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </Pressable>
                )}
              />
            )}
            <Pressable
              onPress={todayDone ? undefined : () => void handleMarkDone()}
              style={[styles.doneBtn, todayDone && styles.doneBtnCompleted]}
              disabled={todayDone}
            >
              <Ionicons
                name={todayDone ? "checkmark-circle" : "checkmark-circle-outline"}
                size={18}
                color={todayDone ? colors.canvas : colors.accent}
                style={{ marginRight: spacing.xs }}
              />
              <Text style={[styles.doneBtnText, todayDone && styles.doneBtnTextCompleted]}>
                {todayDone ? t("plan.alreadyDone") : t("plan.markDone")}
              </Text>
            </Pressable>
          </GlassCard>

          {/* Reset */}
          <Pressable onPress={handleReset} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>{t("plan.resetPlan")}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.md, gap: spacing.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: { padding: spacing.xs },
  headerText: { flex: 1 },
  title: { ...typography.title, color: colors.accent, fontWeight: "800" },
  subtitle: { ...typography.caption, color: colors.textMuted },
  card: { padding: spacing.md, gap: spacing.sm },
  icon: { alignSelf: "center", marginBottom: spacing.sm },
  notStartedText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    textAlign: "center",
    fontWeight: "700",
  },
  hintText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignSelf: "center",
    marginTop: spacing.sm,
  },
  primaryBtnText: { ...typography.subtitle, color: colors.canvas, fontWeight: "700" },
  dayLabel: { ...typography.caption, color: colors.textMuted, fontWeight: "600" },
  progressPercent: { ...typography.title, color: colors.accent, fontWeight: "900" },
  progressBarBg: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.inputBackground,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  progressBarFill: { height: "100%", backgroundColor: colors.accent, borderRadius: radii.pill },
  metaText: { ...typography.caption, color: colors.textMuted },
  sectionTitle: { ...typography.subtitle, color: colors.textPrimary, fontWeight: "700" },
  emptyText: { ...typography.body, color: colors.textMuted },
  chapterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  chapterText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: "transparent",
  },
  doneBtnCompleted: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  doneBtnText: { ...typography.caption, color: colors.accent, fontWeight: "700" },
  doneBtnTextCompleted: { color: colors.canvas },
  resetBtn: { alignSelf: "center", padding: spacing.md },
  resetBtnText: { ...typography.caption, color: colors.danger },
});

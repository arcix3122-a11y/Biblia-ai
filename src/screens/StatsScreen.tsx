import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StreakCalendar } from "@/components/stats/StreakCalendar";
import { GlassCard } from "@/components/GlassCard";
import { getUserStats } from "@/services/stats/userStats";
import * as historyRepo from "@/services/db/historyRepository";
import { colors, radii, spacing, typography } from "@/theme";

// OT: 929 chapters, NT: 260 chapters
const OT_CHAPTERS = 929;
const NT_CHAPTERS = 260;
const TOTAL_CHAPTERS = OT_CHAPTERS + NT_CHAPTERS;

export default function StatsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [chaptersRead, setChaptersRead] = useState(0);
  const [otRead, setOtRead] = useState(0);
  const [ntRead, setNtRead] = useState(0);
  const [activeDates, setActiveDates] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [stats, dates, chaps, ot, nt] = await Promise.all([
          getUserStats(),
          historyRepo.getDistinctReadDates(30),
          historyRepo.countDistinctChaptersRead(),
          historyRepo.countDistinctChaptersReadByTestament("OT"),
          historyRepo.countDistinctChaptersReadByTestament("NT"),
        ]);
        setStreak(stats.streakDays);
        setActiveDates(dates);
        setChaptersRead(chaps);
        setOtRead(ot);
        setNtRead(nt);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const progressPercent = Math.min(100, Math.round((chaptersRead / TOTAL_CHAPTERS) * 100));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.xxl },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.accent} />
        </Pressable>
        <View>
          <Text style={styles.title}>{t("stats.title")}</Text>
          <Text style={styles.subtitle}>{t("stats.subtitle")}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
      ) : (
        <>
          {/* Streak + Chapters Row */}
          <View style={styles.kpiRow}>
            <GlassCard style={styles.kpiCard}>
              <Ionicons name="flame" size={28} color={colors.accent} />
              <Text style={styles.kpiValue}>{streak}</Text>
              <Text style={styles.kpiLabel}>{t("stats.currentStreak")}</Text>
            </GlassCard>
            <GlassCard style={styles.kpiCard}>
              <Ionicons name="book" size={28} color={colors.accent} />
              <Text style={styles.kpiValue}>{chaptersRead}</Text>
              <Text style={styles.kpiLabel}>{t("stats.chaptersRead")}</Text>
            </GlassCard>
          </View>

          {/* Overall + OT/NT Progress */}
          <GlassCard style={styles.card}>
            <View style={styles.progressHeader}>
              <Text style={styles.sectionTitle}>{t("stats.totalChapters")}</Text>
              <Text style={styles.progressPercent}>{progressPercent}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` as `${number}%` }]} />
            </View>
            <Text style={styles.progressMeta}>
              {chaptersRead} / {TOTAL_CHAPTERS}
            </Text>

            <View style={styles.testamentRow}>
              <View style={styles.testamentBlock}>
                <View style={styles.progressHeader}>
                  <Text style={styles.testamentLabel}>{t("stats.oldTestament")}</Text>
                  <Text style={styles.testamentPct}>
                    {Math.min(100, Math.round((otRead / OT_CHAPTERS) * 100))}%
                  </Text>
                </View>
                <View style={[styles.progressBarBg, styles.testamentBar]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(100, Math.round((otRead / OT_CHAPTERS) * 100))}%` as `${number}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressMeta}>{otRead} / {OT_CHAPTERS}</Text>
              </View>

              <View style={styles.testamentBlock}>
                <View style={styles.progressHeader}>
                  <Text style={styles.testamentLabel}>{t("stats.newTestament")}</Text>
                  <Text style={styles.testamentPct}>
                    {Math.min(100, Math.round((ntRead / NT_CHAPTERS) * 100))}%
                  </Text>
                </View>
                <View style={[styles.progressBarBg, styles.testamentBar]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(100, Math.round((ntRead / NT_CHAPTERS) * 100))}%` as `${number}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressMeta}>{ntRead} / {NT_CHAPTERS}</Text>
              </View>
            </View>
          </GlassCard>

          {/* Calendar */}
          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>{t("stats.activity")}</Text>
            {activeDates.length === 0 ? (
              <Text style={styles.emptyText}>{t("stats.noActivity")}</Text>
            ) : (
              <StreakCalendar activeDates={activeDates} />
            )}
          </GlassCard>
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
  title: { ...typography.title, color: colors.accent, fontWeight: "800" },
  subtitle: { ...typography.caption, color: colors.textMuted },
  kpiRow: { flexDirection: "row", gap: spacing.md },
  kpiCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  kpiValue: { ...typography.hero, color: colors.textPrimary, fontWeight: "900" },
  kpiLabel: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
  card: { padding: spacing.md, gap: spacing.sm },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { ...typography.subtitle, color: colors.textPrimary, fontWeight: "700" },
  progressPercent: { ...typography.subtitle, color: colors.accent, fontWeight: "900" },
  progressBarBg: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.inputBackground,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
  },
  progressMeta: { ...typography.caption, color: colors.textMuted },
  emptyText: { ...typography.body, color: colors.textMuted },
  testamentRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorder,
  },
  testamentBlock: { flex: 1, gap: spacing.xs },
  testamentLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: "600" },
  testamentPct: { ...typography.caption, color: colors.accent, fontWeight: "700" },
  testamentBar: { marginTop: 0 },
});

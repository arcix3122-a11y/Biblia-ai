import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { GlassCard } from "@/components/GlassCard";
import { StreakCalendar } from "@/components/stats/StreakCalendar";
import * as historyRepo from "@/services/db/historyRepository";
import {
  applyStreakFreeze,
  getUserStats,
  type DailyActivities,
  type UserStats,
} from "@/services/stats/userStats";
import { colors, radii, spacing, typography } from "@/theme";

type ActivityKey = keyof DailyActivities;

const ACTIVITY_ROWS: {
  key: ActivityKey;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  labelKey:
    | "streakDashboard.activityScripture"
    | "streakDashboard.activityReflection"
    | "streakDashboard.activityPrayer"
    | "streakDashboard.activityPractice";
}[] = [
  { key: "scripture", icon: "book-outline", labelKey: "streakDashboard.activityScripture" },
  { key: "reflection", icon: "sparkles-outline", labelKey: "streakDashboard.activityReflection" },
  { key: "prayer", icon: "heart-outline", labelKey: "streakDashboard.activityPrayer" },
  { key: "practice", icon: "leaf-outline", labelKey: "streakDashboard.activityPractice" },
];

export default function StreakDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [activeDates, setActiveDates] = useState<string[]>([]);
  const [freezing, setFreezing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [userStats, dates] = await Promise.all([
        getUserStats(),
        historyRepo.getDistinctReadDates(30),
      ]);
      setStats(userStats);
      setActiveDates(dates);
    } catch {
      // local-only
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFreeze = useCallback(() => {
    Alert.alert(
      t("streakDashboard.freezeConfirmTitle"),
      t("streakDashboard.freezeConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("streakDashboard.useFreeze"),
          onPress: () => {
            setFreezing(true);
            void applyStreakFreeze()
              .then((next) => {
                setStats(next);
              })
              .finally(() => setFreezing(false));
          },
        },
      ]
    );
  }, [t]);

  const canUseFreeze =
    stats?.freezeAvailable &&
    !stats.streakCompleteToday &&
    stats.streakDays > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.accent} />
        </Pressable>
        <View>
          <Text style={styles.title}>{t("streakDashboard.title")}</Text>
          <Text style={styles.subtitle}>{t("streakDashboard.subtitle")}</Text>
        </View>
      </View>

      {loading || !stats ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
      ) : (
        <>
          <GlassCard style={styles.streakHero}>
            <Ionicons name="flame" size={40} color={colors.accent} />
            <Text style={styles.streakValue}>{stats.streakDays}</Text>
            <Text style={styles.streakLabel}>{t("streakDashboard.currentStreak")}</Text>
            <Text style={styles.streakHint}>
              {stats.streakCompleteToday
                ? t("streakDashboard.streakSavedToday")
                : t("streakDashboard.streakAtRisk")}
            </Text>
          </GlassCard>

          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="snow-outline" size={22} color={colors.accent} />
              <Text style={styles.sectionTitle}>{t("streakDashboard.freezeTitle")}</Text>
            </View>
            <Text style={styles.bodyText}>
              {stats.freezeAvailable
                ? t("streakDashboard.freezeAvailable")
                : t("streakDashboard.freezeUsed")}
            </Text>
            {canUseFreeze ? (
              <Pressable
                onPress={handleFreeze}
                disabled={freezing}
                style={[styles.freezeBtn, freezing && styles.freezeBtnDisabled]}
                accessibilityRole="button"
              >
                {freezing ? (
                  <ActivityIndicator color={colors.canvas} />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark-outline" size={18} color={colors.canvas} />
                    <Text style={styles.freezeBtnText}>{t("streakDashboard.useFreeze")}</Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>{t("streakDashboard.todayBreakdown")}</Text>
            <Text style={styles.breakdownMeta}>
              {t("streakDashboard.missionsProgress", {
                done: stats.activitiesCompletedCount,
                total: 4,
              })}
            </Text>
            <View style={styles.activityList}>
              {ACTIVITY_ROWS.map((row) => {
                const done = stats.activitiesToday[row.key];
                return (
                  <View key={row.key} style={styles.activityRow}>
                    <View style={[styles.activityIcon, done && styles.activityIconDone]}>
                      <Ionicons
                        name={done ? "checkmark" : row.icon}
                        size={18}
                        color={done ? colors.canvas : colors.accent}
                      />
                    </View>
                    <Text style={[styles.activityLabel, done && styles.activityLabelDone]}>
                      {t(row.labelKey)}
                    </Text>
                    <Text style={[styles.activityStatus, done && styles.activityStatusDone]}>
                      {done ? t("streakDashboard.done") : t("streakDashboard.pending")}
                    </Text>
                  </View>
                );
              })}
            </View>
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>{t("streakDashboard.calendarTitle")}</Text>
            {activeDates.length === 0 ? (
              <Text style={styles.bodyText}>{t("streakDashboard.noActivity")}</Text>
            ) : (
              <StreakCalendar activeDates={activeDates} />
            )}
          </GlassCard>

          <Pressable
            onPress={() => router.push("/stats")}
            style={styles.linkRow}
            accessibilityRole="button"
          >
            <Text style={styles.linkText}>{t("streakDashboard.viewFullStats")}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.accent} />
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
  title: { ...typography.title, color: colors.accent, fontWeight: "800" },
  subtitle: { ...typography.caption, color: colors.textMuted },
  streakHero: {
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.xs,
  },
  streakValue: {
    ...typography.hero,
    color: colors.textPrimary,
    fontWeight: "900",
    fontSize: 56,
    lineHeight: 60,
  },
  streakLabel: {
    ...typography.subtitle,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  streakHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  card: { padding: spacing.md, gap: spacing.sm },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  bodyText: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
  freezeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  freezeBtnDisabled: { opacity: 0.6 },
  freezeBtnText: {
    ...typography.subtitle,
    color: colors.canvas,
    fontWeight: "700",
  },
  breakdownMeta: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "600",
  },
  activityList: { gap: spacing.sm, marginTop: spacing.xs },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  activityIconDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  activityLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  activityLabelDone: {
    color: colors.textSecondary,
  },
  activityStatus: {
    ...typography.caption,
    color: colors.textMuted,
  },
  activityStatusDone: {
    color: colors.success,
    fontWeight: "700",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  linkText: {
    ...typography.body,
    color: colors.accent,
    fontWeight: "600",
  },
});

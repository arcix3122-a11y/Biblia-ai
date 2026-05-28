import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { PhotoBackground } from "@/components/PhotoBackground";
import { getCategoryPhotoUrl } from "@/data/photoBackgrounds";
import { shareStreak } from "@/services/share/shareInvite";
import { getUserStats } from "@/services/stats/userStats";
import { colors, radii, spacing, typography } from "@/theme";
import type { MomentumDashboardProps } from "@/types/ui";

export function MomentumDashboard({ style }: MomentumDashboardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [streakDays, setStreakDays] = useState(0);
  const [chaptersReadToday, setChaptersReadToday] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(1);
  const [goalMetToday, setGoalMetToday] = useState(false);
  const [missionsDone, setMissionsDone] = useState(0);
  const [freezeAvailable, setFreezeAvailable] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const stats = await getUserStats();
      setStreakDays(stats.streakDays);
      setChaptersReadToday(stats.chaptersReadToday);
      setDailyGoal(stats.dailyGoal);
      setGoalMetToday(stats.goalMetToday);
      setMissionsDone(stats.activitiesCompletedCount);
      setFreezeAvailable(stats.freezeAvailable);
    } catch {
      // local-only fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleShareStreak = useCallback(async () => {
    if (streakDays < 1) {
      return;
    }
    try {
      await shareStreak(streakDays);
    } catch {
      // share sheet dismissed
    }
  }, [streakDays]);

  if (loading) {
    return (
      <View style={[styles.loadingCard, style]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => router.push("/streak-dashboard" as Href)}
      accessibilityRole="button"
      accessibilityLabel={t("dashboard.viewStats")}
    >
      <PhotoBackground
        uri={getCategoryPhotoUrl("continueReading", 900, 480)}
        style={[styles.card, style]}
        borderRadius={radii.xl}
        scrimOpacity={0.56}
      >
        <View style={styles.content}>
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <View style={styles.streakRow}>
                <Text style={styles.statValue}>{streakDays}</Text>
                {streakDays > 0 ? (
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      void handleShareStreak();
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t("share.shareStreakCta")}
                  >
                    <Ionicons name="share-outline" size={16} color={colors.accent} />
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.statLabel}>{t("dashboard.dayStreak")}</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={[styles.statValue, missionsDone >= 1 && styles.statValueMet]}>
                {missionsDone}/3
              </Text>
              <Text style={styles.statLabel}>{t("dashboard.dailyMission")}</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={[styles.statValue, goalMetToday && styles.statValueMet]}>
                {chaptersReadToday}/{dailyGoal}
              </Text>
              <Text style={styles.statLabel}>{t("dashboard.dailyGoal")}</Text>
            </View>
          </View>

          {freezeAvailable ? (
            <Text style={styles.freezeHint}>{t("dashboard.freezeAvailable")}</Text>
          ) : null}
        </View>
      </PhotoBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
    padding: spacing.lg,
    alignItems: "center",
  },
  card: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 200,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statValue: {
    ...typography.subtitle,
    color: colors.accent,
    fontWeight: "700",
  },
  statValueMet: {
    color: colors.success,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: "center",
  },
  freezeHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
});

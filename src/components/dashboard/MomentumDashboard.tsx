import React, { useCallback, useEffect } from "react";
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
import { useUserStatsStore } from "@/store/userStatsStore";
import { colors, radii, spacing, typography } from "@/theme";
import type { MomentumDashboardProps } from "@/types/ui";

export function MomentumDashboard({ style }: MomentumDashboardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const stats = useUserStatsStore((s) => s.stats);
  const loadStats = useUserStatsStore((s) => s.load);
  const loading = useUserStatsStore((s) => s.loading);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const streakDays = stats?.streakDays ?? 0;
  const chaptersReadToday = stats?.chaptersReadToday ?? 0;
  const dailyGoal = stats?.dailyGoal ?? 1;
  const goalMetToday = stats?.goalMetToday ?? false;
  const missionsDone = stats?.activitiesCompletedCount ?? 0;
  const freezeAvailable = stats?.freezeAvailable ?? true;

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

  if (loading && !stats) {
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

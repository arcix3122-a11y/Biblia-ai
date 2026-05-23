import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@/components/GlassCard";
import { ShareVerseCard } from "@/components/dashboard/ShareVerseCard";
import { getVerseOfTheDay } from "@/services/db/scriptureRepository";
import { captureVerseStory, shareVerseImage } from "@/services/share/verseImageExporter";
import { getUserStats, recordDailyRead } from "@/services/stats/userStats";
import { colors, radii, spacing, typography } from "@/theme";
import type { MomentumDashboardProps } from "@/types/ui";
import type { VerseWithReference } from "@/types/scripture";

export function MomentumDashboard({ style }: MomentumDashboardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [streakDays, setStreakDays] = useState(0);
  const [chaptersReadToday, setChaptersReadToday] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(1);
  const [goalMetToday, setGoalMetToday] = useState(false);
  const [verse, setVerse] = useState<VerseWithReference | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<View>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [stats, votd] = await Promise.all([getUserStats(), getVerseOfTheDay()]);
    setStreakDays(stats.streakDays);
    setChaptersReadToday(stats.chaptersReadToday);
    setDailyGoal(stats.dailyGoal);
    setGoalMetToday(stats.goalMetToday);
    setVerse(votd);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    void recordDailyRead().then((stats) => {
      setStreakDays(stats.streakDays);
      setChaptersReadToday(stats.chaptersReadToday);
      setDailyGoal(stats.dailyGoal);
      setGoalMetToday(stats.goalMetToday);
    });
  }, [load]);

  const onShare = useCallback(async () => {
    if (!verse || sharing) {
      return;
    }
    setSharing(true);
    try {
      const uri = await captureVerseStory(shareRef);
      if (uri) {
        await shareVerseImage(uri);
      }
    } finally {
      setSharing(false);
    }
  }, [sharing, verse]);

  const openVerse = useCallback(() => {
    if (!verse) {
      return;
    }
    router.push(`/reader/${verse.book_slug}/${verse.chapter_number}`);
  }, [router, verse]);

  if (loading) {
    return (
      <GlassCard style={style}>
        <ActivityIndicator color={colors.accent} />
      </GlassCard>
    );
  }

  const reference = verse
    ? `${verse.book_name} ${verse.chapter_number}:${verse.number}`
    : t("common.scripture");

  return (
    <GlassCard style={style}>
      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{streakDays}</Text>
          <Text style={styles.statLabel}>{t("dashboard.dayStreak")}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, goalMetToday && styles.statValueMet]}>
            {chaptersReadToday}/{dailyGoal}
          </Text>
          <Text style={styles.statLabel}>{t("dashboard.dailyGoal")}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.verseBlock}>
          <Text style={styles.sectionLabel}>{t("dashboard.verseOfTheDay")}</Text>
          {verse ? (
            <Pressable onPress={openVerse} accessibilityRole="button">
              <Text style={styles.reference}>{reference}</Text>
              <Text style={styles.verseText} numberOfLines={3}>
                {verse.text}
              </Text>
              <Text style={styles.openHint}>{t("dashboard.tapToRead")}</Text>
            </Pressable>
          ) : (
            <Text style={styles.verseText}>{t("dashboard.readToday")}</Text>
          )}
        </View>
      </View>

      {verse ? (
        <Pressable
          onPress={() => void onShare()}
          disabled={sharing}
          style={[styles.shareButton, sharing && styles.shareDisabled]}
        >
          <Text style={styles.shareLabel}>
            {sharing ? t("dashboard.preparing") : t("dashboard.shareStory")}
          </Text>
        </Pressable>
      ) : null}

      {verse ? (
        <View style={styles.offscreen} pointerEvents="none">
          <ShareVerseCard ref={shareRef} reference={reference} text={verse.text} />
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statBlock: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    ...typography.hero,
    color: colors.accent,
  },
  statValueMet: {
    color: colors.success,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: colors.glassBorder,
  },
  verseBlock: {
    flex: 1,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  reference: {
    ...typography.caption,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  verseText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  openHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  shareButton: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  shareDisabled: {
    opacity: 0.5,
  },
  shareLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  offscreen: {
    position: "absolute",
    left: -9999,
    top: 0,
    opacity: 0,
  },
});

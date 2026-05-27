import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { formatBookReference } from "@/i18n/bookNames";
import { useLocaleStore } from "@/store/localeStore";
import { PhotoBackground } from "@/components/PhotoBackground";
import { getCategoryPhotoUrl } from "@/data/photoBackgrounds";
import { getVerseOfTheDay } from "@/services/db/scriptureRepository";
import { getUserStats, recordDailyRead } from "@/services/stats/userStats";
import { colors, radii, spacing, typography } from "@/theme";
import type { MomentumDashboardProps } from "@/types/ui";
import type { VerseWithReference } from "@/types/scripture";

export function MomentumDashboard({ style }: MomentumDashboardProps) {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const router = useRouter();
  const [streakDays, setStreakDays] = useState(0);
  const [chaptersReadToday, setChaptersReadToday] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(1);
  const [goalMetToday, setGoalMetToday] = useState(false);
  const [verse, setVerse] = useState<VerseWithReference | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stats, votd] = await Promise.all([getUserStats(), getVerseOfTheDay()]);
      setStreakDays(stats.streakDays);
      setChaptersReadToday(stats.chaptersReadToday);
      setDailyGoal(stats.dailyGoal);
      setGoalMetToday(stats.goalMetToday);
      setVerse(votd);
    } catch {
      // local-only fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void recordDailyRead()
      .then((stats) => {
        setStreakDays(stats.streakDays);
        setChaptersReadToday(stats.chaptersReadToday);
        setDailyGoal(stats.dailyGoal);
        setGoalMetToday(stats.goalMetToday);
      })
      .catch(() => {
        // ignore
      });
  }, [load]);

  const openVerse = useCallback(() => {
    if (!verse) {
      return;
    }
    router.push(`/reader/${verse.book_slug}/${verse.chapter_number}`);
  }, [router, verse]);

  if (loading) {
    return (
      <View style={[styles.loadingCard, style]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const reference = verse
    ? formatBookReference(
        verse.book_slug,
        verse.chapter_number,
        verse.number,
        locale,
        verse.book_name
      )
    : t("common.scripture");

  return (
    <PhotoBackground
      uri={getCategoryPhotoUrl("continueReading", 900, 480)}
      style={[styles.card, style]}
      borderRadius={radii.xl}
      scrimOpacity={0.56}
    >
      <View style={styles.content}>
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{streakDays}</Text>
            <Text style={styles.statLabel}>{t("dashboard.dayStreak")}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={[styles.statValue, goalMetToday && styles.statValueMet]}>
              {chaptersReadToday}/{dailyGoal}
            </Text>
            <Text style={styles.statLabel}>{t("dashboard.dailyGoal")}</Text>
          </View>
        </View>

        <View style={styles.verseBlock}>
          <Text style={styles.sectionLabel}>{t("dashboard.verseOfTheDay")}</Text>
          {verse ? (
            <Pressable onPress={openVerse} accessibilityRole="button">
              <Text style={styles.reference}>{reference}</Text>
              <Text style={styles.verseText} numberOfLines={2}>
                {verse.text}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.verseText}>{t("dashboard.readToday")}</Text>
          )}
        </View>
      </View>
    </PhotoBackground>
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
  verseBlock: {
    flex: 1,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  reference: {
    ...typography.caption,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontWeight: "700",
  },
  verseText: {
    ...typography.body,
    color: colors.textPrimary,
    fontStyle: "italic",
  },
});

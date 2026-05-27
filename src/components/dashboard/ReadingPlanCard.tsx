import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { getBookDisplayName } from "@/i18n/bookNames";
import { useLocaleStore } from "@/store/localeStore";
import { useActiveTranslation } from "@/store/translationStore";
import { GlassCard } from "@/components/GlassCard";
import {
  FOUNDATION_WEEK_PLAN,
  getActivePlanDay,
} from "@/data/readingPlans";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import { useReadingPlanStore } from "@/store/readingPlanStore";
import { colors, radii, spacing, typography } from "@/theme";

interface ReadingPlanCardProps {
  style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
}

export function ReadingPlanCard({ style }: ReadingPlanCardProps) {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const translation = useActiveTranslation(locale);
  const router = useRouter();
  const completedDays = useReadingPlanStore((s) => s.completedDays);
  const loadProgress = useReadingPlanStore((s) => s.loadProgress);
  const markDayComplete = useReadingPlanStore((s) => s.markDayComplete);
  const isDayComplete = useReadingPlanStore((s) => s.isDayComplete);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  const activeDay = getActivePlanDay(FOUNDATION_WEEK_PLAN, completedDays);
  const totalDays = FOUNDATION_WEEK_PLAN.days.length;
  const completedCount = completedDays.length;
  const allComplete = completedCount >= totalDays;
  const dayComplete = isDayComplete(activeDay.day);
  const [bookLabel, setBookLabel] = useState(activeDay.bookSlug);

  useEffect(() => {
    void scriptureRepo.getBookBySlug(activeDay.bookSlug).then((book) => {
      setBookLabel(getBookDisplayName(activeDay.bookSlug, locale, book?.name));
    });
  }, [activeDay.bookSlug, locale]);

  const openReading = useCallback(() => {
    void (async () => {
      const available = await scriptureRepo.isChapterAvailable(
        activeDay.bookSlug,
        activeDay.chapter,
        translation
      );
      if (!available) {
        Alert.alert(t("readingPlan.chapterUnavailableTitle"), t("reader.chapterUnavailable"));
        return;
      }
      await markDayComplete(activeDay.day);
      router.push(`/reader/${activeDay.bookSlug}/${activeDay.chapter}`);
    })();
  }, [
    activeDay.bookSlug,
    activeDay.chapter,
    activeDay.day,
    markDayComplete,
    router,
    t,
    translation,
  ]);

  return (
    <GlassCard style={style}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="calendar-outline" size={18} color={colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t("readingPlan.foundationTitle")}</Text>
          <Text style={styles.subtitle}>{t("readingPlan.foundationSubtitle")}</Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>
          {allComplete
            ? t("readingPlan.planComplete")
            : t("readingPlan.dayProgress", {
                current: activeDay.day,
                total: totalDays,
              })}
        </Text>
        <Text style={styles.progressMeta}>
          {t("readingPlan.completedCount", { count: completedCount, total: totalDays })}
        </Text>
      </View>

      {!allComplete ? (
        <>
          <Text style={styles.readingLabel}>{t("readingPlan.todaysReading")}</Text>
          <Text style={styles.readingRef}>
            {t("readingPlan.chapterRef", {
              book: bookLabel,
              chapter: activeDay.chapter,
            })}
          </Text>
          <Pressable onPress={openReading} style={styles.readButton}>
            <Ionicons
              name={dayComplete ? "checkmark-circle" : "book-outline"}
              size={16}
              color={colors.accent}
            />
            <Text style={styles.readButtonText}>
              {dayComplete ? t("readingPlan.readAgain") : t("readingPlan.readNow")}
            </Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.completeMessage}>{t("readingPlan.planCompleteHint")}</Text>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.accentGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  progressLabel: {
    ...typography.label,
    color: colors.accent,
  },
  progressMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  readingLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  readingRef: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  readButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  readButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  completeMessage: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

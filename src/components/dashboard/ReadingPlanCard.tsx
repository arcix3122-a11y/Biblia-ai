import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { PhotoBackground } from "@/components/PhotoBackground";
import { getAssignmentsForDay, PLAN_TOTAL_DAYS } from "@/data/readingPlan";
import { getCategoryPhotoUrl } from "@/data/photoBackgrounds";
import { useFullBibleAvailable } from "@/hooks/useScripture";
import { getBookDisplayName } from "@/i18n/bookNames";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import { useLocaleStore } from "@/store/localeStore";
import { useActiveTranslation } from "@/store/translationStore";
import { useYearPlanStore } from "@/store/yearPlanStore";
import { colors, radii, spacing, typography } from "@/theme";

interface ReadingPlanCardProps {
  style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
}

export function ReadingPlanCard({ style }: ReadingPlanCardProps) {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const translation = useActiveTranslation(locale);
  const router = useRouter();
  const fullBibleAvailable = useFullBibleAvailable();
  const startDate = useYearPlanStore((s) => s.startDate);
  const completedDays = useYearPlanStore((s) => s.completedDays);
  const loaded = useYearPlanStore((s) => s.loaded);
  const load = useYearPlanStore((s) => s.load);
  const startPlan = useYearPlanStore((s) => s.startPlan);
  const isDayComplete = useYearPlanStore((s) => s.isDayComplete);
  const getCurrentDay = useYearPlanStore((s) => s.getCurrentDay);
  const getProgress = useYearPlanStore((s) => s.getProgress);
  const [bookLabel, setBookLabel] = useState("");

  useEffect(() => {
    void load();
  }, [load]);

  const currentDay = getCurrentDay();
  const assignments = useMemo(() => getAssignmentsForDay(currentDay), [currentDay]);
  const firstAssignment = assignments[0] ?? null;
  const todayDone = isDayComplete(currentDay);
  const progress = getProgress();

  useEffect(() => {
    if (!firstAssignment) {
      setBookLabel("");
      return;
    }

    void scriptureRepo.getBookBySlug(firstAssignment.bookSlug).then((book) => {
      setBookLabel(
        getBookDisplayName(firstAssignment.bookSlug, locale, book?.name ?? firstAssignment.bookName)
      );
    });
  }, [firstAssignment, locale]);

  const openPlan = useCallback(() => {
    router.push("/reading-plan");
  }, [router]);

  const openReading = useCallback(() => {
    void (async () => {
      if (!fullBibleAvailable || !firstAssignment) {
        openPlan();
        return;
      }

      if (!startDate) {
        await startPlan();
      }

      const available = await scriptureRepo.isChapterAvailable(
        firstAssignment.bookSlug,
        firstAssignment.chapter,
        translation
      );
      if (!available) {
        Alert.alert(t("readingPlan.chapterUnavailableTitle"), t("reader.chapterUnavailable"));
        return;
      }
      router.push(`/reader/${firstAssignment.bookSlug}/${firstAssignment.chapter}`);
    })();
  }, [firstAssignment, fullBibleAvailable, openPlan, router, startDate, startPlan, t, translation]);

  const completedCount = completedDays.length;

  return (
    <PhotoBackground
      uri={getCategoryPhotoUrl("readingPlan", 900, 420)}
      style={[styles.card, style]}
      borderRadius={radii.xl}
      scrimOpacity={0.58}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Ionicons name="calendar-outline" size={18} color={colors.accent} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t("readingPlan.yearTitle")}</Text>
            <Text style={styles.subtitle}>
              {fullBibleAvailable
                ? t("readingPlan.yearSubtitle")
                : t("readingPlan.fullBibleRequiredShort")}
            </Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>
            {startDate
              ? t("readingPlan.dayProgress", {
                  current: currentDay,
                  total: PLAN_TOTAL_DAYS,
                })
              : t("readingPlan.notStarted")}
          </Text>
          <Text style={styles.progressMeta}>
            {loaded
              ? t("readingPlan.progressPercent", { percent: progress })
              : t("common.loading")}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` as `${number}%` }]} />
        </View>

        {firstAssignment ? (
          <>
            <Text style={styles.readingLabel}>
              {t("readingPlan.assignmentsCount", { count: assignments.length })}
            </Text>
            <Text style={styles.readingRef}>
              {t("readingPlan.chapterRef", {
                book: bookLabel || firstAssignment.bookName,
                chapter: firstAssignment.chapter,
              })}
            </Text>
          </>
        ) : (
          <Text style={styles.completeMessage}>{t("readingPlan.planCompleteHint")}</Text>
        )}

        <View style={styles.actions}>
          <Pressable onPress={openReading} style={styles.readButton}>
            <Ionicons
              name={todayDone ? "checkmark-circle" : startDate ? "book-outline" : "play-outline"}
              size={16}
              color={colors.accent}
            />
            <Text style={styles.readButtonText}>
              {!fullBibleAvailable
                ? t("readingPlan.openPlan")
                : !startDate
                  ? t("readingPlan.startPlan")
                  : todayDone
                    ? t("readingPlan.readAgain")
                    : t("readingPlan.readNow")}
            </Text>
          </Pressable>
          <Pressable onPress={openPlan} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{t("readingPlan.openPlan")}</Text>
          </Pressable>
        </View>
      </View>
    </PhotoBackground>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 230,
  },
  content: {
    padding: spacing.lg,
  },
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
    backgroundColor: "rgba(0,0,0,0.35)",
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
    color: "rgba(255,255,255,0.75)",
    marginTop: spacing.xs,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  progressLabel: {
    ...typography.label,
    color: colors.accent,
  },
  progressMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  progressTrack: {
    height: 8,
    borderRadius: radii.pill,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
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
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
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
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  readButtonText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
  },
  completeMessage: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
});

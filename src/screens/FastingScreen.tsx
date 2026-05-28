import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/GlassCard";
import { getBookDisplayName, formatBookReference } from "@/i18n/bookNames";
import { useLocaleStore } from "@/store/localeStore";
import { useActiveTranslation } from "@/store/translationStore";
import { useSelectionStore } from "@/store/selectionStore";
import { useFastingPlanStore } from "@/store/fastingPlanStore";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import {
  getFastingDayPlan,
  getFastingTheme,
  type FastingVerseReference,
} from "@/data/fastingPlan";
import type { VerseWithReference } from "@/types/scripture";
import { colors, radii, spacing, typography } from "@/theme";

async function loadVerse(reference: FastingVerseReference, translation: "en" | "pl") {
  const book = await scriptureRepo.getBookBySlug(reference.bookSlug);
  if (!book) {
    return null;
  }

  const verses = await scriptureRepo.getVersesByBookAndChapter(book.id, reference.chapter, translation);
  const verse = verses.find((item) => item.number === reference.verse);
  if (!verse) {
    return null;
  }

  return {
    ...verse,
    book_id: book.id,
    book_name: book.name,
    book_slug: book.slug,
    chapter_number: reference.chapter,
  } satisfies VerseWithReference;
}

export default function FastingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locale = useLocaleStore((s) => s.locale);
  const translation = useActiveTranslation(locale);
  const setSelectedVerse = useSelectionStore((s) => s.setSelectedVerse);
  const {
    startDate,
    completedDays,
    loaded,
    load,
    startPlan,
    resetPlan,
    markDayComplete,
    isDayComplete,
    getCurrentDay,
    getProgress,
  } = useFastingPlanStore();

  const [currentVerses, setCurrentVerses] = useState<VerseWithReference[]>([]);
  const [loadingVerses, setLoadingVerses] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const currentDay = getCurrentDay();
  const currentPlan = useMemo(() => getFastingDayPlan(currentDay), [currentDay]);
  const currentTheme = currentPlan ? getFastingTheme(currentPlan.themeId) : undefined;
  const progress = getProgress();
  const currentDone = isDayComplete(currentDay);
  const journeyComplete = completedDays.length >= 40;

  useEffect(() => {
    let mounted = true;

    if (!currentPlan) {
      setCurrentVerses([]);
      setLoadingVerses(false);
      return () => {
        mounted = false;
      };
    }

    setLoadingVerses(true);
    Promise.all(currentPlan.verseRefs.map((reference) => loadVerse(reference, translation)))
      .then((results) => {
        if (mounted) {
          setCurrentVerses(results.filter((item): item is VerseWithReference => Boolean(item)));
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingVerses(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [currentPlan, translation]);

  const handleStart = useCallback(async () => {
    await startPlan();
  }, [startPlan]);

  const handleMarkDone = useCallback(async () => {
    await markDayComplete(currentDay);
  }, [currentDay, markDayComplete]);

  const handleReset = useCallback(() => {
    Alert.alert(t("fasting.resetConfirmTitle"), t("fasting.resetConfirmBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("fasting.resetJourney"), style: "destructive", onPress: () => void resetPlan() },
    ]);
  }, [resetPlan, t]);

  const handleOpenVerse = useCallback(
    async (verse: VerseWithReference) => {
      const book = await scriptureRepo.getBookBySlug(verse.book_slug);
      if (!book) {
        return;
      }

      setSelectedVerse({
        bookId: book.id,
        bookName: getBookDisplayName(book.slug, locale, book.name),
        bookSlug: book.slug,
        chapter: verse.chapter_number,
        verse: verse.number,
        text: verse.text,
      });

      router.push(`/reader/${verse.book_slug}/${verse.chapter_number}?verse=${verse.number}`);
    },
    [locale, router, setSelectedVerse]
  );

  if (!loaded) {
    return null;
  }

  const themeTitle = currentTheme ? t(currentTheme.titleKey) : "";
  const themeSubtitle = currentTheme ? t(currentTheme.subtitleKey) : "";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
    >
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={colors.accent} />
      </Pressable>

      <GlassCard style={styles.card}>
        <Text style={styles.title}>{t("fasting.title")}</Text>
        <Text style={styles.subtitle}>{t("fasting.subtitle")}</Text>
      </GlassCard>

      {!startDate ? (
        <GlassCard style={styles.card}>
          <Ionicons name="flame-outline" size={44} color={colors.accent} style={styles.icon} />
          <Text style={styles.notStartedTitle}>{t("fasting.notStartedTitle")}</Text>
          <Text style={styles.notStartedBody}>{t("fasting.notStartedBody")}</Text>
          <Pressable onPress={() => void handleStart()} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{t("fasting.startJourney")}</Text>
          </Pressable>
        </GlassCard>
      ) : (
        <>
          {journeyComplete ? (
            <GlassCard style={styles.card}>
              <Ionicons name="checkmark-circle-outline" size={40} color={colors.accent} style={styles.icon} />
              <Text style={styles.completeTitle}>{t("fasting.journeyCompleteTitle")}</Text>
              <Text style={styles.completeBody}>{t("fasting.journeyCompleteBody")}</Text>
            </GlassCard>
          ) : null}

          <GlassCard style={styles.card}>
            <Text style={styles.dayLabel}>{t("fasting.dayLabel", { day: currentDay })}</Text>
            <Text style={styles.weekLabel}>{t("fasting.weekLabel", { week: currentPlan?.week ?? 1 })}</Text>
            <Text style={styles.progressPercent}>{t("fasting.progressLabel", { percent: progress })}</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` as `${number}%` }]} />
            </View>
            <Text style={styles.metaText}>{t("fasting.completedDays", { count: completedDays.length })}</Text>
          </GlassCard>

          {currentTheme ? (
            <GlassCard style={styles.card}>
              <Text style={styles.sectionTitle}>{themeTitle}</Text>
              <Text style={styles.sectionSubtitle}>{themeSubtitle}</Text>
              <Text style={styles.sectionMeta}>{t("fasting.practicePrompt", { theme: themeTitle })}</Text>
              <Text style={styles.sectionMeta}>{t("fasting.prayerPrompt", { theme: themeTitle })}</Text>
            </GlassCard>
          ) : null}

          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>{t("fasting.verseSectionTitle")}</Text>
            {loadingVerses ? (
              <Text style={styles.emptyText}>{t("common.loading")}</Text>
            ) : currentVerses.length === 0 ? (
              <Text style={styles.emptyText}>{t("fasting.noVerseFound")}</Text>
            ) : (
              currentVerses.map((verse) => (
                <Pressable key={verse.id} onPress={() => void handleOpenVerse(verse)} style={styles.verseCard}>
                  <Text style={styles.verseRef}>
                    {formatBookReference(
                      verse.book_slug,
                      verse.chapter_number,
                      verse.number,
                      locale,
                      verse.book_name
                    )}
                  </Text>
                  <Text style={styles.verseText}>{verse.text}</Text>
                </Pressable>
              ))
            )}
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>{t("fasting.practiceSectionTitle")}</Text>
            <Text style={styles.practiceText}>{t("fasting.practiceBody", { theme: themeTitle })}</Text>
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>{t("fasting.prayerSectionTitle")}</Text>
            <Text style={styles.practiceText}>{t("fasting.prayerBody", { theme: themeTitle })}</Text>
          </GlassCard>

          <Pressable
            onPress={currentDone ? undefined : () => void handleMarkDone()}
            style={[styles.doneBtn, currentDone && styles.doneBtnCompleted]}
            disabled={currentDone}
          >
            <Ionicons
              name={currentDone ? "checkmark-circle" : "checkmark-circle-outline"}
              size={18}
              color={currentDone ? colors.canvas : colors.accent}
              style={{ marginRight: spacing.xs }}
            />
            <Text style={[styles.doneBtnText, currentDone && styles.doneBtnTextCompleted]}>
              {currentDone ? t("fasting.alreadyDone") : t("fasting.markDone")}
            </Text>
          </Pressable>

          <Pressable onPress={handleReset} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>{t("fasting.resetJourney")}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.md, gap: spacing.md },
  backBtn: { padding: spacing.xs, alignSelf: "flex-start" },
  card: { padding: spacing.md, gap: spacing.sm },
  title: { ...typography.title, color: colors.accent, fontWeight: "800" },
  subtitle: { ...typography.caption, color: colors.textMuted },
  icon: { alignSelf: "center", marginBottom: spacing.sm },
  notStartedTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    textAlign: "center",
    fontWeight: "700",
  },
  notStartedBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  completeTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    textAlign: "center",
    fontWeight: "700",
  },
  completeBody: {
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
  weekLabel: { ...typography.caption, color: colors.textMuted },
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
  sectionSubtitle: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  sectionMeta: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  emptyText: { ...typography.body, color: colors.textMuted },
  verseCard: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  verseRef: { ...typography.caption, color: colors.accent, fontWeight: "700" },
  verseText: { ...typography.body, color: colors.textPrimary, lineHeight: 22 },
  practiceText: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
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
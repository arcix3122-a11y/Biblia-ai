import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/GlassCard";
import { getPractice, isPracticeId } from "@/data/practices";
import { getFastingDayPlan, getFastingTheme } from "@/data/fastingPlan";
import { getRosarySet, ROSARY_SETS, ROSARY_TOTAL_DECADES } from "@/data/rosary";
import { getStation, STATION_TOTAL } from "@/data/stations";
import { getBookDisplayName, formatBookReference } from "@/i18n/bookNames";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import { usePracticeAudio } from "@/hooks/usePracticeAudio";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import { useActiveTranslation } from "@/store/translationStore";
import { useLocaleStore } from "@/store/localeStore";
import { useSelectionStore } from "@/store/selectionStore";
import { useFastingPlanStore } from "@/store/fastingPlanStore";
import { useRosaryStore } from "@/store/rosaryStore";
import { sharePracticeCompletion } from "@/services/share/shareInvite";
import { getPracticeShareDay } from "@/utils/practiceShareDay";
import { useStationsStore } from "@/store/stationsStore";
import { hydratePracticeProgressStores, usePracticesStore } from "@/store/practicesStore";
import type { VerseWithReference } from "@/types/scripture";
import { colors, radii, spacing, typography } from "@/theme";

type VerseRef = { bookSlug: string; chapter: number; verse: number };

async function loadVerseFromRef(reference: VerseRef, translation: "en" | "pl") {
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

export default function PracticeSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, locale } = useAppTranslation();
  const appLocale = useLocaleStore((s) => s.locale);
  const translation = useActiveTranslation(appLocale);
  const setSelectedVerse = useSelectionStore((s) => s.setSelectedVerse);
  const recordStepCompleted = usePracticesStore((s) => s.recordStepCompleted);
  const streakCount = usePracticesStore((s) => s.streakCount);

  const practice = useMemo(() => (isPracticeId(id) ? getPractice(id) : undefined), [id]);
  const { speak, stop } = usePracticeAudio(locale);

  const fastingStartDate = useFastingPlanStore((s) => s.startDate);
  const fastingCompletedDays = useFastingPlanStore((s) => s.completedDays);
  const fastingLoaded = useFastingPlanStore((s) => s.loaded);
  const fastingStartPlan = useFastingPlanStore((s) => s.startPlan);
  const fastingResetPlan = useFastingPlanStore((s) => s.resetPlan);
  const fastingMarkDayComplete = useFastingPlanStore((s) => s.markDayComplete);
  const fastingIsDayComplete = useFastingPlanStore((s) => s.isDayComplete);
  const fastingGetCurrentDay = useFastingPlanStore((s) => s.getCurrentDay);
  const fastingGetProgress = useFastingPlanStore((s) => s.getProgress);

  const stationsStartDate = useStationsStore((s) => s.startDate);
  const stationsCompleted = useStationsStore((s) => s.completedStations);
  const stationsLoaded = useStationsStore((s) => s.loaded);
  const stationsStartJourney = useStationsStore((s) => s.startJourney);
  const stationsResetJourney = useStationsStore((s) => s.resetJourney);
  const stationsMarkComplete = useStationsStore((s) => s.markStationComplete);
  const stationsIsComplete = useStationsStore((s) => s.isStationComplete);
  const stationsGetCurrent = useStationsStore((s) => s.getCurrentStation);
  const stationsGetProgress = useStationsStore((s) => s.getProgress);

  const rosaryStartDate = useRosaryStore((s) => s.startDate);
  const rosarySelectedSetId = useRosaryStore((s) => s.selectedSetId);
  const rosaryCurrentDecade = useRosaryStore((s) => s.currentDecade);
  const rosaryBeadCount = useRosaryStore((s) => s.beadCount);
  const rosaryLoaded = useRosaryStore((s) => s.loaded);
  const rosaryStartJourney = useRosaryStore((s) => s.startJourney);
  const rosaryResetJourney = useRosaryStore((s) => s.resetJourney);
  const rosarySelectSet = useRosaryStore((s) => s.selectSet);
  const rosaryCountBead = useRosaryStore((s) => s.countBead);
  const rosaryGetProgress = useRosaryStore((s) => s.getProgress);
  const rosaryIsJourneyComplete = useRosaryStore((s) => s.isJourneyComplete);

  const [verses, setVerses] = useState<VerseWithReference[]>([]);
  const [loadingVerses, setLoadingVerses] = useState(false);

  useEffect(() => {
    void hydratePracticeProgressStores();
  }, []);

  const verseRefs = useMemo((): readonly VerseRef[] => {
    if (!practice) {
      return [];
    }

    if (practice.id === "fasting") {
      const day = fastingGetCurrentDay();
      const plan = getFastingDayPlan(day);
      return plan?.verseRefs ?? [];
    }

    if (practice.id === "stations") {
      const stationNum = stationsGetCurrent();
      const station = getStation(stationNum);
      return station?.verseRefs ?? [];
    }

    if (practice.id === "rosary") {
      const set = getRosarySet(rosarySelectedSetId) ?? ROSARY_SETS[0]!;
      const mystery = set.mysteries[Math.min(rosaryCurrentDecade, ROSARY_TOTAL_DECADES - 1)];
      return mystery?.verseRefs ?? [];
    }

    return [];
  }, [
    practice,
    fastingStartDate,
    fastingCompletedDays,
    fastingGetCurrentDay,
    stationsStartDate,
    stationsCompleted,
    stationsGetCurrent,
    rosarySelectedSetId,
    rosaryCurrentDecade,
  ]);

  useEffect(() => {
    let mounted = true;

    if (verseRefs.length === 0) {
      setVerses([]);
      setLoadingVerses(false);
      return () => {
        mounted = false;
      };
    }

    setLoadingVerses(true);
    Promise.all(verseRefs.map((ref) => loadVerseFromRef(ref, translation)))
      .then((results) => {
        if (mounted) {
          setVerses(results.filter((item): item is VerseWithReference => Boolean(item)));
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
  }, [verseRefs, translation]);

  const progress = useMemo(() => {
    if (!practice) {
      return 0;
    }
    switch (practice.id) {
      case "fasting":
        return fastingGetProgress();
      case "stations":
        return stationsGetProgress();
      case "rosary":
        return rosaryGetProgress();
      default:
        return 0;
    }
  }, [
    practice,
    fastingCompletedDays.length,
    stationsCompleted.length,
    rosaryCurrentDecade,
    rosaryBeadCount,
    fastingGetProgress,
    stationsGetProgress,
    rosaryGetProgress,
  ]);

  const stepLabel = useMemo(() => {
    if (!practice) {
      return "";
    }

    if (practice.id === "fasting") {
      const day = fastingGetCurrentDay();
      return t("practices.session.fastingStep", { day, total: practice.stepCount });
    }

    if (practice.id === "stations") {
      const current = stationsGetCurrent();
      return t("practices.session.stationsStep", { current, total: STATION_TOTAL });
    }

    const set = getRosarySet(rosarySelectedSetId) ?? ROSARY_SETS[0]!;
    return t("practices.session.rosaryStep", {
      decade: rosaryCurrentDecade + 1,
      total: ROSARY_TOTAL_DECADES,
      set: t(set.titleKey as any),
    });
  }, [practice, fastingStartDate, fastingCompletedDays, stationsCompleted, rosarySelectedSetId, rosaryCurrentDecade, t, fastingGetCurrentDay, stationsGetCurrent]);

  const handleStart = useCallback(async () => {
    if (!practice) {
      return;
    }

    switch (practice.id) {
      case "fasting":
        await fastingStartPlan();
        break;
      case "stations":
        await stationsStartJourney();
        break;
      case "rosary":
        await rosaryStartJourney();
        break;
      default:
        break;
    }
  }, [practice, fastingStartPlan, stationsStartJourney, rosaryStartJourney]);

  const handleCompleteStep = useCallback(async () => {
    if (!practice) {
      return;
    }

    switch (practice.id) {
      case "fasting": {
        const day = fastingGetCurrentDay();
        await fastingMarkDayComplete(day);
        break;
      }
      case "stations": {
        const stationNum = stationsGetCurrent();
        await stationsMarkComplete(stationNum);
        break;
      }
      case "rosary":
        await rosaryCountBead();
        break;
      default:
        break;
    }

    await recordStepCompleted(practice.id);
  }, [
    practice,
    fastingGetCurrentDay,
    fastingMarkDayComplete,
    stationsGetCurrent,
    stationsMarkComplete,
    rosaryCountBead,
    recordStepCompleted,
  ]);

  const handleSharePractice = useCallback(async () => {
    if (!practice) {
      return;
    }
    const day = getPracticeShareDay(practice.id);
    try {
      await sharePracticeCompletion({
        practiceId: practice.id,
        practiceName: t(practice.titleKey),
        day,
      });
    } catch {
      // share sheet dismissed
    }
  }, [practice, t]);

  const handleReset = useCallback(() => {
    if (!practice) {
      return;
    }

    const titleKey =
      practice.id === "fasting"
        ? "fasting.resetConfirmTitle"
        : practice.id === "stations"
          ? "stations.resetConfirmTitle"
          : "rosary.resetConfirmTitle";
    const bodyKey =
      practice.id === "fasting"
        ? "fasting.resetConfirmBody"
        : practice.id === "stations"
          ? "stations.resetConfirmBody"
          : "rosary.resetConfirmBody";
    const actionKey =
      practice.id === "fasting"
        ? "fasting.resetJourney"
        : practice.id === "stations"
          ? "stations.resetJourney"
          : "rosary.resetJourney";

    Alert.alert(t(titleKey), t(bodyKey), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t(actionKey),
        style: "destructive",
        onPress: () => {
          void (async () => {
            if (practice.id === "fasting") {
              await fastingResetPlan();
            } else if (practice.id === "stations") {
              await stationsResetJourney();
            } else {
              await rosaryResetJourney();
            }
          })();
        },
      },
    ]);
  }, [practice, fastingResetPlan, stationsResetJourney, rosaryResetJourney, t]);

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

  const handleSpeakStep = useCallback(() => {
    if (!practice) {
      return;
    }

    if (practice.id === "fasting") {
      const day = fastingGetCurrentDay();
      const plan = getFastingDayPlan(day);
      const theme = plan ? getFastingTheme(plan.themeId) : undefined;
      const themeTitle = theme ? t(theme.titleKey) : "";
      speak(`${t("practices.session.fastingStep", { day, total: practice.stepCount })}. ${themeTitle}. ${verses.map((v) => v.text).join(" ")}`);
      return;
    }

    if (practice.id === "stations") {
      const stationNum = stationsGetCurrent();
      const station = getStation(stationNum);
      const stationTitle = station ? t(station.titleKey as any) : "";
      speak(
        `${stationTitle}. ${t("stations.reflectionBody", { station: stationTitle })}`
      );
      return;
    }

    const set = getRosarySet(rosarySelectedSetId) ?? ROSARY_SETS[0]!;
    const mystery = set.mysteries[Math.min(rosaryCurrentDecade, ROSARY_TOTAL_DECADES - 1)];
    const mysteryTitle = mystery ? t(mystery.titleKey as any) : "";
    speak(`${mysteryTitle}. ${t("rosary.meditationBody", { mystery: mysteryTitle })}`);
  }, [practice, fastingGetCurrentDay, stationsGetCurrent, rosarySelectedSetId, rosaryCurrentDecade, speak, t, verses]);

  const started = useMemo(() => {
    if (!practice) {
      return false;
    }
    switch (practice.id) {
      case "fasting":
        return Boolean(fastingStartDate);
      case "stations":
        return Boolean(stationsStartDate);
      case "rosary":
        return Boolean(rosaryStartDate);
      default:
        return false;
    }
  }, [practice, fastingStartDate, stationsStartDate, rosaryStartDate]);

  const stepDone = useMemo(() => {
    if (!practice || !started) {
      return false;
    }

    if (practice.id === "fasting") {
      return fastingIsDayComplete(fastingGetCurrentDay());
    }

    if (practice.id === "stations") {
      return stationsIsComplete(stationsGetCurrent());
    }

    return rosaryIsJourneyComplete();
  }, [practice, started, fastingIsDayComplete, fastingGetCurrentDay, stationsIsComplete, stationsGetCurrent, rosaryIsJourneyComplete]);

  const journeyComplete = useMemo(() => {
    if (!practice || !started) {
      return false;
    }
    switch (practice.id) {
      case "fasting":
        return fastingCompletedDays.length >= practice.stepCount;
      case "stations":
        return stationsCompleted.length >= STATION_TOTAL;
      case "rosary":
        return rosaryIsJourneyComplete();
      default:
        return false;
    }
  }, [practice, started, fastingCompletedDays.length, stationsCompleted.length, rosaryIsJourneyComplete]);

  if (!practice) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>{t("practices.notFound")}</Text>
      </View>
    );
  }

  const notLoaded = !fastingLoaded || !stationsLoaded || !rosaryLoaded;
  if (notLoaded) {
    return null;
  }

  const fastingDay = fastingGetCurrentDay();
  const fastingPlan = getFastingDayPlan(fastingDay);
  const fastingTheme = fastingPlan ? getFastingTheme(fastingPlan.themeId) : undefined;
  const stationNum = stationsGetCurrent();
  const station = getStation(stationNum);
  const rosarySet = getRosarySet(rosarySelectedSetId) ?? ROSARY_SETS[0]!;
  const rosaryMystery = rosarySet.mysteries[Math.min(rosaryCurrentDecade, ROSARY_TOTAL_DECADES - 1)];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={colors.accent} />
        </Pressable>
        <Text style={styles.topTitle}>{t(practice.titleKey)}</Text>
        <Pressable onPress={() => void handleSpeakStep()} hitSlop={12}>
          <Ionicons name="volume-high-outline" size={22} color={colors.accent} />
        </Pressable>
      </View>

      {!started ? (
        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>{t("practices.session.notStartedTitle")}</Text>
          <Text style={styles.cardBody}>{t("practices.session.notStartedBody")}</Text>
          {practice.id === "rosary" ? (
            <View style={styles.setRow}>
              {ROSARY_SETS.map((set) => (
                <Pressable
                  key={set.id}
                  onPress={() => void rosarySelectSet(set.id)}
                  style={[
                    styles.setChip,
                    rosarySelectedSetId === set.id && styles.setChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.setChipText,
                      rosarySelectedSetId === set.id && styles.setChipTextSelected,
                    ]}
                  >
                    {t(set.titleKey as any)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Pressable onPress={() => void handleStart()} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{t("practices.startSession")}</Text>
          </Pressable>
        </GlassCard>
      ) : (
        <>
          <GlassCard style={styles.card}>
            <Text style={styles.stepLabel}>{stepLabel}</Text>
            <Text style={styles.progressPercent}>{t("practices.progress", { percent: progress })}</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` as `${number}%` }]} />
            </View>
            <Text style={styles.streak}>{t("practices.streak", { count: streakCount })}</Text>
            <Pressable
              onPress={() => void handleSharePractice()}
              style={styles.sharePracticeBtn}
              accessibilityRole="button"
              accessibilityLabel={t("share.sharePracticeCta")}
            >
              <Ionicons name="share-outline" size={16} color={colors.accent} />
              <Text style={styles.sharePracticeText}>{t("share.sharePracticeCta")}</Text>
            </Pressable>
          </GlassCard>

          {journeyComplete ? (
            <GlassCard style={styles.card}>
              <Ionicons
                name="checkmark-circle-outline"
                size={44}
                color={colors.accent}
                style={{ alignSelf: "center", marginBottom: spacing.xs }}
              />
              <Text
                style={[
                  styles.cardTitle,
                  { textAlign: "center", color: colors.accent, fontWeight: "800" },
                ]}
              >
                {t(`${practice.id}.journeyCompleteTitle` as any)}
              </Text>
              <Text style={[styles.cardBody, { textAlign: "center", lineHeight: 22, marginTop: spacing.xs }]}>
                {t(`${practice.id}.journeyCompleteBody` as any)}
              </Text>
            </GlassCard>
          ) : null}

          {!journeyComplete ? (
            <>
              {practice.id === "fasting" && fastingTheme ? (
                <GlassCard style={styles.card}>
                  <Text style={styles.sectionTitle}>{t(fastingTheme.titleKey)}</Text>
                  <Text style={styles.sectionBody}>{t(fastingTheme.subtitleKey)}</Text>
                </GlassCard>
              ) : null}

              {practice.id === "stations" && station ? (
                <GlassCard style={styles.card}>
                  <Text style={styles.sectionTitle}>{t(station.titleKey as any)}</Text>
                  <Text style={styles.sectionBody}>
                    {t("stations.reflectionBody", { station: t(station.titleKey as any) })}
                  </Text>
                </GlassCard>
              ) : null}

              {practice.id === "rosary" && rosaryMystery ? (
                <GlassCard style={styles.card}>
                  <Text style={styles.sectionTitle}>{t(rosaryMystery.titleKey as any)}</Text>
                  <Text style={styles.sectionBody}>
                    {t("rosary.meditationBody", { mystery: t(rosaryMystery.titleKey as any) })}
                  </Text>
                  <Text style={styles.meta}>
                    {t("rosary.beadCountLabel", { count: rosaryBeadCount, total: 10 })}
                  </Text>
                </GlassCard>
              ) : null}

              <GlassCard style={styles.card}>
                <Text style={styles.sectionTitle}>{t("practices.session.versesTitle")}</Text>
                {loadingVerses ? (
                  <Text style={styles.muted}>{t("common.loading")}</Text>
                ) : verses.length === 0 ? (
                  <Text style={styles.muted}>{t("practices.session.noVerses")}</Text>
                ) : (
                  verses.map((verse) => (
                    <Pressable key={verse.id} onPress={() => void handleOpenVerse(verse)} style={styles.verseRow}>
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

              <Pressable
                onPress={stepDone && practice.id !== "rosary" ? undefined : () => void handleCompleteStep()}
                style={[styles.primaryBtn, stepDone && practice.id !== "rosary" && styles.primaryBtnDisabled]}
                disabled={stepDone && practice.id !== "rosary"}
              >
                <Text style={styles.primaryBtnText}>
                  {practice.id === "rosary"
                    ? t("rosary.countBead")
                    : stepDone
                      ? t("practices.session.stepDone")
                      : t("practices.session.completeStep")}
                </Text>
              </Pressable>
            </>
          ) : null}

          <Pressable onPress={handleReset} style={styles.resetBtn}>
            <Text style={styles.resetText}>{t("practices.session.reset")}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.md, gap: spacing.md },
  centered: { justifyContent: "center", alignItems: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  topTitle: { ...typography.subtitle, color: colors.accent, fontWeight: "700", flex: 1, textAlign: "center" },
  card: { padding: spacing.md, gap: spacing.sm },
  cardTitle: { ...typography.subtitle, color: colors.textPrimary, fontWeight: "700" },
  cardBody: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  stepLabel: { ...typography.title, color: colors.accent, fontWeight: "800" },
  progressPercent: { ...typography.caption, color: colors.textMuted },
  progressBarBg: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.inputBackground,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  progressBarFill: { height: "100%", backgroundColor: colors.accent },
  streak: { ...typography.caption, color: colors.textMuted },
  sharePracticeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
  sharePracticeText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "600",
  },
  sectionTitle: { ...typography.subtitle, color: colors.textPrimary, fontWeight: "700" },
  sectionBody: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  meta: { ...typography.caption, color: colors.textMuted },
  verseRow: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  verseRef: { ...typography.caption, color: colors.accent, fontWeight: "700" },
  verseText: { ...typography.body, color: colors.textPrimary, lineHeight: 22 },
  muted: { ...typography.body, color: colors.textMuted },
  setRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  setChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  setChipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  setChipText: { ...typography.caption, color: colors.textSecondary },
  setChipTextSelected: { color: colors.canvas, fontWeight: "700" },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: { ...typography.subtitle, color: colors.canvas, fontWeight: "700" },
  resetBtn: { alignSelf: "center", padding: spacing.md },
  resetText: { ...typography.caption, color: colors.danger },
});

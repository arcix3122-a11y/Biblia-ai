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
import { useRosaryStore } from "@/store/rosaryStore";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import { getRosarySet, ROSARY_SETS, ROSARY_TOTAL_DECADES, type RosaryVerseReference } from "@/data/rosary";
import type { VerseWithReference } from "@/types/scripture";
import { colors, radii, spacing, typography } from "@/theme";

async function loadVerse(reference: RosaryVerseReference, translation: "en" | "pl") {
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

export default function RosaryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locale = useLocaleStore((s) => s.locale);
  const translation = useActiveTranslation(locale);
  const setSelectedVerse = useSelectionStore((s) => s.setSelectedVerse);
  const {
    startDate,
    selectedSetId,
    currentDecade,
    beadCount,
    loaded,
    load,
    startJourney,
    resetJourney,
    selectSet,
    countBead,
    getProgress,
    isJourneyComplete,
  } = useRosaryStore();

  const [loadedVerses, setLoadedVerses] = useState<VerseWithReference[]>([]);
  const [loadingVerses, setLoadingVerses] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedSet = useMemo(() => getRosarySet(selectedSetId) ?? ROSARY_SETS[0]!, [selectedSetId]);
  const currentMystery = selectedSet.mysteries[Math.min(currentDecade, ROSARY_TOTAL_DECADES - 1)];
  const progress = getProgress();
  const journeyComplete = isJourneyComplete();

  useEffect(() => {
    let mounted = true;

    if (!currentMystery) {
      setLoadedVerses([]);
      setLoadingVerses(false);
      return () => {
        mounted = false;
      };
    }

    setLoadingVerses(true);
    Promise.all(currentMystery.verseRefs.map((reference) => loadVerse(reference, translation)))
      .then((results) => {
        if (mounted) {
          setLoadedVerses(results.filter((item): item is VerseWithReference => Boolean(item)));
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
  }, [currentMystery, translation]);

  const handleStart = useCallback(async () => {
    await startJourney();
  }, [startJourney]);

  const handleReset = useCallback(() => {
    Alert.alert(t("rosary.resetConfirmTitle"), t("rosary.resetConfirmBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("rosary.resetJourney"), style: "destructive", onPress: () => void resetJourney() },
    ]);
  }, [resetJourney, t]);

  const handleCountBead = useCallback(async () => {
    await countBead();
  }, [countBead]);

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}> 
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.accent} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t("rosary.title")}</Text>
          <Text style={styles.subtitle}>{t("rosary.subtitle")}</Text>
        </View>
      </View>

      {!startDate ? (
        <GlassCard style={styles.card}>
          <Ionicons name="radio-button-on-outline" size={44} color={colors.accent} style={styles.icon} />
          <Text style={styles.notStartedTitle}>{t("rosary.notStartedTitle")}</Text>
          <Text style={styles.notStartedBody}>{t("rosary.notStartedBody")}</Text>
          <View style={styles.setPicker}>
            {ROSARY_SETS.map((set) => (
              <Pressable
                key={set.id}
                onPress={() => void selectSet(set.id)}
                style={[styles.setChip, selectedSetId === set.id && styles.setChipActive]}
              >
                <Text style={[styles.setChipText, selectedSetId === set.id && styles.setChipTextActive]}>
                  {t(set.titleKey as any)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => void handleStart()} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{t("rosary.startJourney")}</Text>
          </Pressable>
        </GlassCard>
      ) : (
        <>
          {journeyComplete ? (
            <GlassCard style={styles.card}>
              <Ionicons name="checkmark-circle-outline" size={40} color={colors.accent} style={styles.icon} />
              <Text style={styles.completeTitle}>{t("rosary.journeyCompleteTitle")}</Text>
              <Text style={styles.completeBody}>{t("rosary.journeyCompleteBody")}</Text>
            </GlassCard>
          ) : null}

          <GlassCard style={styles.card}>
            <Text style={styles.dayLabel}>{t("rosary.setLabel", { set: t(selectedSet.titleKey as any) })}</Text>
            <Text style={styles.progressPercent}>{t("rosary.progressLabel", { percent: progress })}</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` as `${number}%` }]} />
            </View>
            <Text style={styles.metaText}>{t("rosary.decadeLabel", { current: currentDecade + 1, total: ROSARY_TOTAL_DECADES })}</Text>
            <Text style={styles.metaText}>{t("rosary.beadCountLabel", { count: beadCount, total: 10 })}</Text>
          </GlassCard>

          {currentMystery ? (
            <GlassCard style={styles.card}>
              <Text style={styles.sectionTitle}>{t(currentMystery.titleKey as any)}</Text>
              <Text style={styles.sectionSubtitle}>{t(selectedSet.subtitleKey as any)}</Text>
              <Text style={styles.sectionMeta}>{t("rosary.mysteryPrompt", { mystery: t(currentMystery.titleKey as any) })}</Text>
            </GlassCard>
          ) : null}

          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>{t("rosary.verseSectionTitle")}</Text>
            {loadingVerses ? (
              <Text style={styles.emptyText}>{t("common.loading")}</Text>
            ) : loadedVerses.length === 0 ? (
              <Text style={styles.emptyText}>{t("rosary.noVerseFound")}</Text>
            ) : (
              loadedVerses.map((verse) => (
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

          {currentMystery ? (
            <GlassCard style={styles.card}>
              <Text style={styles.sectionTitle}>{t("rosary.meditationSectionTitle")}</Text>
              <Text style={styles.practiceText}>{t("rosary.meditationBody", { mystery: t(currentMystery.titleKey as any) })}</Text>
            </GlassCard>
          ) : null}

          {currentMystery ? (
            <GlassCard style={styles.card}>
              <Text style={styles.sectionTitle}>{t("rosary.prayerSectionTitle")}</Text>
              <Text style={styles.practiceText}>{t("rosary.prayerBody", { mystery: t(currentMystery.titleKey as any) })}</Text>
            </GlassCard>
          ) : null}

          <Pressable onPress={() => void handleCountBead()} style={styles.primaryBtn} disabled={journeyComplete}>
            <Text style={styles.primaryBtnText}>{t("rosary.countBead")}</Text>
          </Pressable>

          <View style={styles.beadRow}>
            {Array.from({ length: 10 }, (_, index) => (
              <View key={index} style={[styles.bead, index < beadCount && styles.beadActive]} />
            ))}
          </View>

          <Pressable onPress={handleReset} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>{t("rosary.resetJourney")}</Text>
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
  headerText: { flex: 1 },
  title: { ...typography.title, color: colors.accent, fontWeight: "800" },
  subtitle: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  card: { padding: spacing.md, gap: spacing.sm },
  icon: { alignSelf: "center", marginBottom: spacing.sm },
  notStartedTitle: { ...typography.subtitle, color: colors.textPrimary, textAlign: "center", fontWeight: "700" },
  notStartedBody: { ...typography.body, color: colors.textSecondary, textAlign: "center", lineHeight: 22 },
  completeTitle: { ...typography.subtitle, color: colors.textPrimary, textAlign: "center", fontWeight: "700" },
  completeBody: { ...typography.body, color: colors.textSecondary, textAlign: "center", lineHeight: 22 },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignSelf: "center",
    marginTop: spacing.sm,
  },
  primaryBtnText: { ...typography.subtitle, color: colors.canvas, fontWeight: "700" },
  setPicker: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, justifyContent: "center" },
  setChip: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  setChipActive: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  setChipText: { ...typography.caption, color: colors.textMuted, fontWeight: "700" },
  setChipTextActive: { color: colors.textPrimary },
  dayLabel: { ...typography.caption, color: colors.textMuted, fontWeight: "600" },
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
  beadRow: { flexDirection: "row", justifyContent: "center", gap: spacing.xs, marginTop: spacing.sm },
  bead: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  beadActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  resetBtn: { alignSelf: "center", padding: spacing.md },
  resetBtnText: { ...typography.caption, color: colors.danger },
});
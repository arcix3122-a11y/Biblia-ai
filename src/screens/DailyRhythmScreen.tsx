import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassCard } from "@/components/GlassCard";
import { PhotoBackground } from "@/components/PhotoBackground";
import { getDailyPracticeForDate } from "@/data/dailyPractice";
import { getCategoryPhotoUrl } from "@/data/photoBackgrounds";
import { formatBookReference } from "@/i18n/bookNames";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import { useLocaleStore } from "@/store/localeStore";
import { useNotesStore } from "@/store/notesStore";
import { useActiveTranslation } from "@/store/translationStore";
import {
  useDailyRhythmStore,
  type DailyRhythmStep,
} from "@/store/dailyRhythmStore";
import type { VerseWithReference } from "@/types/scripture";
import { colors, radii, spacing, typography } from "@/theme";

const STEPS: DailyRhythmStep[] = ["votd", "reflection", "prayer", "journal"];

const STEP_ICONS: Record<DailyRhythmStep, React.ComponentProps<typeof Ionicons>["name"]> = {
  votd: "book-outline",
  reflection: "sparkles-outline",
  prayer: "heart-outline",
  journal: "create-outline",
};

export default function DailyRhythmScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locale = useLocaleStore((s) => s.locale);
  const translation = useActiveTranslation(locale);
  const saveNote = useNotesStore((s) => s.saveNote);
  const loadNotes = useNotesStore((s) => s.loadNotes);

  const stepsToday = useDailyRhythmStore((s) => s.stepsToday);
  const markStep = useDailyRhythmStore((s) => s.markStep);
  const resetIfNewDay = useDailyRhythmStore((s) => s.resetIfNewDay);
  const isCompleteToday = useDailyRhythmStore((s) => s.isCompleteToday);

  const [loading, setLoading] = useState(true);
  const [verse, setVerse] = useState<VerseWithReference | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [journalText, setJournalText] = useState("");
  const [savingJournal, setSavingJournal] = useState(false);
  const [finished, setFinished] = useState(false);

  const practice = useMemo(() => getDailyPracticeForDate(), []);
  const verseRef = verse
    ? formatBookReference(
        verse.book_slug,
        verse.chapter_number,
        verse.number,
        locale,
        verse.book_name
      )
    : "";

  useEffect(() => {
    resetIfNewDay();
    if (isCompleteToday()) {
      setFinished(true);
    }
    void loadNotes();
    void scriptureRepo.getVerseOfTheDay(translation).then((votd) => {
      setVerse(votd);
      setLoading(false);
    });
  }, [isCompleteToday, loadNotes, resetIfNewDay, translation]);

  useEffect(() => {
    const firstIncomplete = STEPS.findIndex((step) => !stepsToday[step]);
    if (firstIncomplete >= 0) {
      setActiveStep(firstIncomplete);
    } else if (isCompleteToday()) {
      setFinished(true);
    }
  }, [isCompleteToday, stepsToday]);

  const stepKey = STEPS[activeStep]!;
  const stepDone = stepsToday[stepKey];

  const advanceStep = useCallback(() => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      setFinished(true);
    }
  }, [activeStep]);

  const handleStepComplete = useCallback(() => {
    if (!stepDone) {
      markStep(stepKey);
    }
    advanceStep();
  }, [advanceStep, markStep, stepDone, stepKey]);

  const handleSaveJournal = useCallback(async () => {
    const trimmed = journalText.trim();
    if (!trimmed) return;
    setSavingJournal(true);
    try {
      const title = t("dailyRhythm.journalNoteTitle", { date: new Date().toLocaleDateString(locale === "pl" ? "pl-PL" : "en-US") });
      const body = verseRef
        ? `${verseRef}\n\n${trimmed}`
        : trimmed;
      await saveNote(null, title, body);
      if (!stepsToday.journal) {
        markStep("journal");
      }
      setFinished(true);
    } finally {
      setSavingJournal(false);
    }
  }, [journalText, locale, markStep, saveNote, stepsToday.journal, t, verseRef]);

  const completedCount = STEPS.filter((s) => stepsToday[s]).length;

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingText}>{t("dailyRhythm.loading")}</Text>
      </View>
    );
  }

  if (finished || isCompleteToday()) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="close" size={24} color={colors.accent} />
          </Pressable>
        </View>
        <View style={styles.completeWrap}>
          <Ionicons name="checkmark-circle" size={72} color={colors.success} />
          <Text style={styles.completeTitle}>{t("dailyRhythm.completeTitle")}</Text>
          <Text style={styles.completeBody}>{t("dailyRhythm.completeBody")}</Text>
          <Pressable
            onPress={() => router.back()}
            style={styles.primaryBtn}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>{t("dailyRhythm.backHome")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.accent} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{t("dailyRhythm.title")}</Text>
            <Text style={styles.subtitle}>{t("dailyRhythm.subtitle")}</Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          {STEPS.map((step, index) => {
            const done = stepsToday[step];
            const current = index === activeStep;
            return (
              <View key={step} style={styles.progressItem}>
                <View
                  style={[
                    styles.progressDot,
                    done && styles.progressDotDone,
                    current && styles.progressDotCurrent,
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={14} color={colors.canvas} />
                  ) : (
                    <Ionicons
                      name={STEP_ICONS[step]}
                      size={14}
                      color={current ? colors.canvas : colors.textMuted}
                    />
                  )}
                </View>
                <Text
                  style={[styles.progressLabel, current && styles.progressLabelCurrent]}
                  numberOfLines={1}
                >
                  {t(`dailyRhythm.steps.${step}`)}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.progressMeta}>
          {t("dailyRhythm.progress", { done: completedCount, total: STEPS.length })}
        </Text>

        {stepKey === "votd" ? (
          <PhotoBackground
            uri={getCategoryPhotoUrl("votd", 900, 520)}
            style={styles.heroCard}
            borderRadius={radii.xl}
            scrimOpacity={0.62}
          >
            <View style={styles.heroInner}>
              <Text style={styles.stepEyebrow}>{t("dailyRhythm.steps.votd")}</Text>
              <Text style={styles.verseRef}>{verseRef}</Text>
              <Text style={styles.verseText}>{verse?.text ?? t("dailyRhythm.verseUnavailable")}</Text>
              <Pressable
                onPress={handleStepComplete}
                style={styles.primaryBtn}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>{t("dailyRhythm.continue")}</Text>
              </Pressable>
            </View>
          </PhotoBackground>
        ) : null}

        {stepKey === "reflection" ? (
          <GlassCard style={styles.stepCard}>
            <Text style={styles.stepEyebrow}>{t("dailyRhythm.steps.reflection")}</Text>
            <Text style={styles.promptText}>{t("dailyRhythm.reflectionPrompt")}</Text>
            <Text style={styles.reflectionBody}>{t("viralFeed.offlineMeditation")}</Text>
            {verseRef ? (
              <Text style={styles.verseRefSmall}>{verseRef}</Text>
            ) : null}
            <Pressable
              onPress={handleStepComplete}
              style={styles.primaryBtn}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>{t("dailyRhythm.continue")}</Text>
            </Pressable>
          </GlassCard>
        ) : null}

        {stepKey === "prayer" ? (
          <GlassCard style={styles.stepCard}>
            <Text style={styles.stepEyebrow}>{t("dailyRhythm.steps.prayer")}</Text>
            <Text style={styles.prayerTitle}>{t(practice.titleKey)}</Text>
            <Text style={styles.promptText}>{t(practice.promptKey)}</Text>
            {practice.stepKeys.map((key, i) => (
              <View key={key} style={styles.prayerStepRow}>
                <Text style={styles.prayerStepNum}>{i + 1}</Text>
                <Text style={styles.prayerStepText}>{t(key)}</Text>
              </View>
            ))}
            <Pressable
              onPress={handleStepComplete}
              style={styles.primaryBtn}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>{t("dailyRhythm.prayerDone")}</Text>
            </Pressable>
          </GlassCard>
        ) : null}

        {stepKey === "journal" ? (
          <GlassCard style={styles.stepCard}>
            <Text style={styles.stepEyebrow}>{t("dailyRhythm.steps.journal")}</Text>
            <Text style={styles.promptText}>{t("dailyRhythm.journalPrompt")}</Text>
            <TextInput
              value={journalText}
              onChangeText={setJournalText}
              placeholder={t("dailyRhythm.journalPlaceholder")}
              placeholderTextColor={colors.textMuted}
              style={styles.journalInput}
              multiline
              textAlignVertical="top"
              accessibilityLabel={t("dailyRhythm.journalPlaceholder")}
            />
            <Pressable
              onPress={() => void handleSaveJournal()}
              disabled={!journalText.trim() || savingJournal}
              style={[
                styles.primaryBtn,
                (!journalText.trim() || savingJournal) && styles.primaryBtnDisabled,
              ]}
              accessibilityRole="button"
            >
              {savingJournal ? (
                <ActivityIndicator color={colors.canvas} />
              ) : (
                <Text style={styles.primaryBtnText}>{t("dailyRhythm.saveJournal")}</Text>
              )}
            </Pressable>
            <Pressable
              onPress={handleStepComplete}
              style={styles.skipBtn}
              accessibilityRole="button"
            >
              <Text style={styles.skipBtnText}>{t("dailyRhythm.skipJournal")}</Text>
            </Pressable>
          </GlassCard>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.md, gap: spacing.md },
  centered: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  loadingText: { ...typography.body, color: colors.textMuted },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  backBtn: { padding: spacing.xs },
  headerCopy: { flex: 1, gap: 2 },
  title: { ...typography.title, color: colors.accent, fontWeight: "800" },
  subtitle: { ...typography.caption, color: colors.textMuted },
  progressRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  progressItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  progressDotCurrent: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  progressLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: "center",
  },
  progressLabelCurrent: {
    color: colors.accent,
    fontWeight: "700",
  },
  progressMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  heroCard: {
    minHeight: 320,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  heroInner: {
    padding: spacing.lg,
    gap: spacing.md,
    flex: 1,
    justifyContent: "flex-end",
  },
  stepCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  stepEyebrow: {
    ...typography.label,
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  verseRef: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  verseRefSmall: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  verseText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 26,
  },
  promptText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  reflectionBody: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  prayerTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  prayerStepRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  prayerStepNum: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "800",
    width: 20,
  },
  prayerStepText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 22,
  },
  journalInput: {
    minHeight: 140,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.inputBackground,
    padding: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    ...typography.subtitle,
    color: colors.canvas,
    fontWeight: "700",
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  skipBtnText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  completeWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  completeTitle: {
    ...typography.title,
    color: colors.textPrimary,
    fontWeight: "800",
    textAlign: "center",
  },
  completeBody: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 24,
  },
});

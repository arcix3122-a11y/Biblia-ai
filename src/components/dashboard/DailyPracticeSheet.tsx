import React, { useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { PhotoBackground } from "@/components/PhotoBackground";
import type { DailyPracticeDefinition } from "@/data/dailyPractice";
import { getCategoryPhotoUrl } from "@/data/photoBackgrounds";
import { useDailyEngagementStore } from "@/store/dailyEngagementStore";
import { hapticSuccess } from "@/utils/haptics";
import { colors, radii, spacing, typography } from "@/theme";

interface DailyPracticeSheetProps {
  visible: boolean;
  practice: DailyPracticeDefinition;
  onClose: () => void;
}

export function DailyPracticeSheet({ visible, practice, onClose }: DailyPracticeSheetProps) {
  const { t } = useTranslation();
  const markPracticeComplete = useDailyEngagementStore((s) => s.markPracticeComplete);
  const [stepIndex, setStepIndex] = useState(0);

  const resetAndClose = useCallback(() => {
    setStepIndex(0);
    onClose();
  }, [onClose]);

  const handleComplete = useCallback(() => {
    markPracticeComplete();
    void hapticSuccess();
    resetAndClose();
  }, [markPracticeComplete, resetAndClose]);

  const handleNext = useCallback(() => {
    if (stepIndex >= practice.stepKeys.length - 1) {
      handleComplete();
      return;
    }
    setStepIndex((prev) => prev + 1);
  }, [handleComplete, practice.stepKeys.length, stepIndex]);

  const photoUrl = getCategoryPhotoUrl(practice.photoKey, 900, 600);
  const isLastStep = stepIndex >= practice.stepKeys.length - 1;
  const stepKey = practice.stepKeys[stepIndex];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={resetAndClose}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable
            onPress={resetAndClose}
            style={styles.closeBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
          >
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
          <Text style={styles.headerTitle}>{t("home.dailyPractice.sheetTitle")}</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <PhotoBackground uri={photoUrl} style={styles.hero} borderRadius={radii.xl} scrimOpacity={0.55}>
            <View style={styles.heroContent}>
              <Text style={styles.heroEyebrow}>
                {t("home.dailyPractice.minutes", { min: practice.minutes })}
              </Text>
              <Text style={styles.heroTitle}>{t(practice.titleKey)}</Text>
              <Text style={styles.heroPrompt}>{t(practice.promptKey)}</Text>
            </View>
          </PhotoBackground>

          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepLabel}>
                {t("home.dailyPractice.stepLabel", {
                  current: stepIndex + 1,
                  total: practice.stepKeys.length,
                })}
              </Text>
            </View>
            <Text style={styles.stepText}>{t(stepKey)}</Text>
          </View>

          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={
              isLastStep ? t("home.dailyPractice.done") : t("home.dailyPractice.nextStep")
            }
          >
            <Text style={styles.primaryBtnText}>
              {isLastStep ? t("home.dailyPractice.done") : t("home.dailyPractice.nextStep")}
            </Text>
            <Ionicons
              name={isLastStep ? "checkmark-circle-outline" : "arrow-forward"}
              size={18}
              color={colors.canvas}
            />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  closeBtn: { padding: spacing.xs },
  headerTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
  body: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  hero: {
    minHeight: 180,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  heroContent: {
    padding: spacing.lg,
    gap: spacing.xs,
    justifyContent: "flex-end",
    minHeight: 180,
  },
  heroEyebrow: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
  },
  heroTitle: {
    ...typography.hero,
    color: colors.textPrimary,
    fontSize: 26,
  },
  heroPrompt: {
    ...typography.body,
    color: "rgba(255,255,255,0.86)",
    lineHeight: 22,
  },
  stepCard: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  stepText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  primaryBtnPressed: {
    opacity: 0.92,
  },
  primaryBtnText: {
    ...typography.subtitle,
    color: colors.canvas,
    fontWeight: "700",
  },
});

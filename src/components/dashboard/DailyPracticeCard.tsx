import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { PhotoBackground } from "@/components/PhotoBackground";
import { getDailyPracticeForDate } from "@/data/dailyPractice";
import { getCategoryPhotoUrl } from "@/data/photoBackgrounds";
import { useDailyEngagementStore } from "@/store/dailyEngagementStore";
import { DailyPracticeSheet } from "./DailyPracticeSheet";
import { colors, radii, spacing, typography } from "@/theme";

export function DailyPracticeCard() {
  const { t } = useTranslation();
  const practice = useMemo(() => getDailyPracticeForDate(), []);
  const isComplete = useDailyEngagementStore((s) => s.isPracticeCompleteToday());
  const [sheetOpen, setSheetOpen] = useState(false);

  const photoUrl = getCategoryPhotoUrl(practice.photoKey, 900, 480);

  if (isComplete) {
    return (
      <View style={styles.completedRow}>
        <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
        <Text style={styles.completedText}>{t("home.dailyPractice.completedToday")}</Text>
        <Text style={styles.completedMeta}>{t(practice.titleKey)}</Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setSheetOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t("home.dailyPractice.ctaStart")}
        style={({ pressed }) => [styles.wrapper, pressed && styles.wrapperPressed]}
      >
        <PhotoBackground uri={photoUrl} style={styles.card} borderRadius={radii.xl} scrimOpacity={0.56}>
          <View style={styles.content}>
            <View style={styles.topRow}>
              <View style={styles.iconBubble}>
                <Ionicons name="leaf-outline" size={18} color={colors.accent} />
              </View>
              <Text style={styles.eyebrow}>{t("home.dailyPractice.sectionTitle")}</Text>
            </View>
            <Text style={styles.title}>{t(practice.titleKey)}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {t("home.dailyPractice.minutes", { min: practice.minutes })} · {t(practice.promptKey)}
            </Text>
            <View style={styles.ctaRow}>
              <Text style={styles.cta}>{t("home.dailyPractice.ctaStart")}</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.textPrimary} />
            </View>
          </View>
        </PhotoBackground>
      </Pressable>

      <DailyPracticeSheet
        visible={sheetOpen}
        practice={practice}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radii.xl,
    overflow: "hidden",
  },
  wrapperPressed: {
    opacity: 0.94,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 148,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xs,
    minHeight: 148,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: colors.accentMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    ...typography.label,
    color: colors.accent,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 18,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.18)",
  },
  cta: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
  },
  completedText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
  },
  completedMeta: {
    ...typography.caption,
    color: colors.textMuted,
    flexBasis: "100%",
    marginLeft: 26,
  },
});

import React, { useCallback, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { PhotoBackground } from "@/components/PhotoBackground";
import { getCategoryPhotoUrl } from "@/data/photoBackgrounds";
import { useDailyRhythmStore } from "@/store/dailyRhythmStore";
import { colors, radii, spacing, typography } from "@/theme";

const TOTAL_STEPS = 4;

export function DailyRhythmCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const resetIfNewDay = useDailyRhythmStore((s) => s.resetIfNewDay);
  const isCompleteToday = useDailyRhythmStore((s) => s.isCompleteToday);
  const completedStepCount = useDailyRhythmStore((s) => s.completedStepCount);

  const load = useCallback(() => {
    resetIfNewDay();
  }, [resetIfNewDay]);

  useEffect(() => {
    load();
  }, [load]);

  const done = isCompleteToday();
  const progress = completedStepCount();

  return (
    <Pressable
      onPress={() => router.push("/daily-rhythm" as Href)}
      accessibilityRole="button"
      accessibilityLabel={t("dailyRhythm.cardTitle")}
    >
      <PhotoBackground
        uri={getCategoryPhotoUrl("guidedPrayer", 900, 360)}
        style={styles.card}
        borderRadius={radii.xl}
        scrimOpacity={0.58}
      >
        <View style={styles.content}>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons
                name={done ? "checkmark-circle" : "sunny-outline"}
                size={22}
                color={done ? colors.success : colors.accent}
              />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{t("dailyRhythm.cardTitle")}</Text>
              <Text style={styles.sub}>
                {done
                  ? t("dailyRhythm.cardComplete")
                  : t("dailyRhythm.cardSub", { min: 10 })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </View>
          {!done ? (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round((progress / TOTAL_STEPS) * 100)}%` as `${number}%` },
                ]}
              />
            </View>
          ) : null}
          {!done && progress > 0 ? (
            <Text style={styles.progressMeta}>
              {t("dailyRhythm.progress", { done: progress, total: TOTAL_STEPS })}
            </Text>
          ) : null}
        </View>
      </PhotoBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 120,
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 2 },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  sub: {
    ...typography.caption,
    color: colors.textMuted,
  },
  progressTrack: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
  },
  progressMeta: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "600",
  },
});

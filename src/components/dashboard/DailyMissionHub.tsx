import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { DailyPracticeSheet } from "@/components/dashboard/DailyPracticeSheet";
import { getDailyPracticeForDate } from "@/data/dailyPractice";
import { useHistoryStore } from "@/store/historyStore";
import {
  getUserStats,
  isMissionComplete,
  type DailyActivities,
} from "@/services/stats/userStats";
import { colors, radii, spacing, typography } from "@/theme";

type MissionId = "scripture" | "prayer" | "reflection";

interface MissionTile {
  id: MissionId;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  titleKey: string;
  subKey: string;
}

const MISSIONS: MissionTile[] = [
  {
    id: "scripture",
    icon: "book-outline",
    titleKey: "home.dailyMission.scriptureTitle",
    subKey: "home.dailyMission.scriptureSub",
  },
  {
    id: "prayer",
    icon: "heart-outline",
    titleKey: "home.dailyMission.prayerTitle",
    subKey: "home.dailyMission.prayerSub",
  },
  {
    id: "reflection",
    icon: "sparkles-outline",
    titleKey: "home.dailyMission.reflectionTitle",
    subKey: "home.dailyMission.reflectionSub",
  },
];

interface DailyMissionHubProps {
  onOpenReflection?: () => void;
  reflectionAvailable?: boolean;
}

export function DailyMissionHub({
  onOpenReflection,
  reflectionAvailable = false,
}: DailyMissionHubProps) {
  const { t: tAny } = useTranslation();
  const t = tAny as (key: string, options?: Record<string, unknown>) => string;
  const router = useRouter();
  const lastRead = useHistoryStore((s) => s.lastRead);
  const practice = useMemo(() => getDailyPracticeForDate(), []);
  const [activities, setActivities] = useState<DailyActivities>({
    scripture: false,
    practice: false,
    reflection: false,
    prayer: false,
  });
  const [completedCount, setCompletedCount] = useState(0);
  const [practiceOpen, setPracticeOpen] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const stats = await getUserStats();
      setActivities(stats.activitiesToday);
      setCompletedCount(stats.activitiesCompletedCount);
    } catch {
      // local-only
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleScripture = useCallback(() => {
    if (lastRead?.book_slug) {
      router.push(`/reader/${lastRead.book_slug}/${lastRead.chapter}`);
      return;
    }
    router.push("/reading-plan");
  }, [lastRead, router]);

  const handlePrayer = useCallback(() => {
    setPracticeOpen(true);
  }, []);

  const handleReflection = useCallback(() => {
    if (onOpenReflection) {
      onOpenReflection();
    }
  }, [onOpenReflection]);

  const handleMissionPress = useCallback(
    (id: MissionId) => {
      if (id === "scripture") {
        handleScripture();
        return;
      }
      if (id === "prayer") {
        handlePrayer();
        return;
      }
      handleReflection();
    },
    [handleReflection, handlePrayer, handleScripture]
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{t("home.dailyMission.sectionTitle")}</Text>
        <Text style={styles.progressMeta}>
          {t("home.dailyMission.progress", { done: completedCount, total: 3 })}
        </Text>
      </View>

      <View style={styles.tileRow}>
        {MISSIONS.map((mission) => {
          const done = isMissionComplete(activities, mission.id);
          const disabled = mission.id === "reflection" && !reflectionAvailable && !done;

          return (
            <Pressable
              key={mission.id}
              onPress={() => handleMissionPress(mission.id)}
              disabled={disabled}
              style={({ pressed }) => [
                styles.tile,
                done && styles.tileDone,
                disabled && styles.tileDisabled,
                pressed && !disabled && styles.tilePressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t(mission.titleKey)}
              accessibilityState={{ disabled, selected: done }}
            >
              <View style={[styles.iconWrap, done && styles.iconWrapDone]}>
                <Ionicons
                  name={done ? "checkmark-circle" : mission.icon}
                  size={20}
                  color={done ? colors.success : colors.accent}
                />
              </View>
              <Text style={styles.tileTitle} numberOfLines={1}>
                {t(mission.titleKey)}
              </Text>
              <Text style={styles.tileSub} numberOfLines={2}>
                {done ? t("home.dailyMission.done") : t(mission.subKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <DailyPracticeSheet
        visible={practiceOpen}
        practice={practice}
        onClose={() => {
          setPracticeOpen(false);
          void loadStats();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
  },
  progressMeta: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "600",
  },
  tileRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
    padding: spacing.sm,
    gap: spacing.xs,
    minHeight: 108,
  },
  tileDone: {
    borderColor: colors.accentMuted,
    backgroundColor: colors.accentGlow,
  },
  tileDisabled: {
    opacity: 0.45,
  },
  tilePressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.inputBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapDone: {
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  tileTitle: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  tileSub: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 16,
  },
});

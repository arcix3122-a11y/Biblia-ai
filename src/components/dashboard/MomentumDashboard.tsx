import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GlassCard } from "@/components/GlassCard";
import { ShareVerseCard } from "@/components/dashboard/ShareVerseCard";
import { getVerseOfTheDay } from "@/services/db/scriptureRepository";
import { captureVerseStory, shareVerseImage } from "@/services/share/verseImageExporter";
import { getUserStats, recordDailyRead } from "@/services/stats/userStats";
import { colors, radii, spacing, typography } from "@/theme";
import type { MomentumDashboardProps } from "@/types/ui";
import type { VerseWithReference } from "@/types/scripture";

export function MomentumDashboard({ style }: MomentumDashboardProps) {
  const [streakDays, setStreakDays] = useState(0);
  const [verse, setVerse] = useState<VerseWithReference | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<View>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [stats, votd] = await Promise.all([getUserStats(), getVerseOfTheDay()]);
    setStreakDays(stats.streakDays);
    setVerse(votd);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    void recordDailyRead().then((stats) => setStreakDays(stats.streakDays));
  }, [load]);

  const onShare = useCallback(async () => {
    if (!verse || sharing) {
      return;
    }
    setSharing(true);
    try {
      const uri = await captureVerseStory(shareRef);
      if (uri) {
        await shareVerseImage(uri);
      }
    } finally {
      setSharing(false);
    }
  }, [sharing, verse]);

  if (loading) {
    return (
      <GlassCard style={style}>
        <ActivityIndicator color={colors.accent} />
      </GlassCard>
    );
  }

  const reference = verse
    ? `${verse.book_name} ${verse.chapter_number}:${verse.number}`
    : "Scripture";

  return (
    <GlassCard style={style}>
      <View style={styles.row}>
        <View style={styles.streakBlock}>
          <Text style={styles.streakValue}>{streakDays}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.verseBlock}>
          <Text style={styles.sectionLabel}>Verse of the day</Text>
          {verse ? (
            <>
              <Text style={styles.reference}>{reference}</Text>
              <Text style={styles.verseText} numberOfLines={3}>
                {verse.text}
              </Text>
            </>
          ) : (
            <Text style={styles.verseText}>Read today to unlock your verse.</Text>
          )}
        </View>
      </View>

      {verse ? (
        <Pressable
          onPress={() => void onShare()}
          disabled={sharing}
          style={[styles.shareButton, sharing && styles.shareDisabled]}
        >
          <Text style={styles.shareLabel}>{sharing ? "Preparing…" : "Share story image"}</Text>
        </Pressable>
      ) : null}

      {verse ? (
        <View style={styles.offscreen} pointerEvents="none">
          <ShareVerseCard ref={shareRef} reference={reference} text={verse.text} />
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  streakBlock: {
    minWidth: 72,
    alignItems: "center",
  },
  streakValue: {
    ...typography.hero,
    color: colors.accent,
  },
  streakLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: colors.glassBorder,
  },
  verseBlock: {
    flex: 1,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  reference: {
    ...typography.caption,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  verseText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  shareButton: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  shareDisabled: {
    opacity: 0.5,
  },
  shareLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  offscreen: {
    position: "absolute",
    left: -9999,
    top: 0,
    opacity: 0,
  },
});

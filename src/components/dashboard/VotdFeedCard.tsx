import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { getVerseOfTheDay } from "@/services/db/scriptureRepository";
import { getUserStats, recordDailyRead } from "@/services/stats/userStats";
import { useLocaleStore } from "@/store/localeStore";
import { useActiveTranslation } from "@/store/translationStore";
import { formatBookReference } from "@/i18n/bookNames";
import { getDeviceLocale } from "@/i18n";
import { colors, radii, spacing, typography } from "@/theme";
import type { VerseWithReference } from "@/types/scripture";

interface VotdFeedCardProps {
  onVerse?: (text: string, reference: string) => void;
}

export function VotdFeedCard({ onVerse }: VotdFeedCardProps) {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale) ?? getDeviceLocale();
  const translation = useActiveTranslation(locale);
  const router = useRouter();
  const cardRef = useRef<View>(null);

  const [verse, setVerse] = useState<VerseWithReference | null>(null);
  const [streak, setStreak] = useState(0);
  const [chaptersToday, setChaptersToday] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(1);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [votd, stats] = await Promise.all([
        getVerseOfTheDay(translation),
        getUserStats(),
      ]);
      setVerse(votd);
      setStreak(stats.streakDays);
      setChaptersToday(stats.chaptersReadToday);
      setDailyGoal(stats.dailyGoal);
      if (votd && onVerse) {
        onVerse(
          votd.text,
          formatBookReference(votd.book_slug, votd.chapter_number, votd.number, locale, votd.book_name)
        );
      }
      await recordDailyRead();
    };
    void load();
  }, [locale, onVerse, translation]);

  const handleShare = useCallback(async () => {
    if (!verse || sharing) return;
    setSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (available && cardRef.current) {
        const uri = await captureRef(cardRef, { format: "png", quality: 0.95 });
        await Sharing.shareAsync(uri, { mimeType: "image/png" });
      } else {
        await Share.share({
          message: `${formatBookReference(verse.book_slug, verse.chapter_number, verse.number, locale, verse.book_name)} — "${verse.text}"`,
        });
      }
    } catch {
      // share cancelled
    } finally {
      setSharing(false);
    }
  }, [locale, verse, sharing]);

  const openVerse = useCallback(() => {
    if (!verse) return;
    router.push(`/reader/${verse.book_slug}/${verse.chapter_number}`);
  }, [router, verse]);

  if (!verse) return null;

  const reference = formatBookReference(
    verse.book_slug,
    verse.chapter_number,
    verse.number,
    locale,
    verse.book_name
  );
  const goalMet = chaptersToday >= dailyGoal;

  return (
    <View style={styles.wrapper}>
      <Pressable
        ref={cardRef}
        onPress={openVerse}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${reference}. ${verse.text}`}
      >
        <View style={styles.headerRow}>
          <Text style={styles.eyebrow}>{t("viralFeed.verseOfDay")}</Text>
          <Pressable
            onPress={() => void handleShare()}
            disabled={sharing}
            hitSlop={10}
            style={[styles.shareBtn, sharing && styles.shareBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel={t("viralFeed.share")}
          >
            <Ionicons name="share-outline" size={18} color={colors.accent} />
          </Pressable>
        </View>
        <Text style={styles.reference}>{reference}</Text>
        <Text style={styles.verseText}>{verse.text}</Text>
      </Pressable>

      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <Ionicons name="flame" size={14} color={colors.accent} />
          <Text style={styles.statText}>
            {streak} {t("dashboard.dayStreak")}
          </Text>
        </View>
        <View style={[styles.statChip, goalMet && styles.statChipMet]}>
          <Ionicons
            name="checkmark-circle"
            size={14}
            color={goalMet ? colors.success : colors.textMuted}
          />
          <Text style={[styles.statText, goalMet && styles.statTextMet]}>
            {chaptersToday}/{dailyGoal} {t("dashboard.dailyGoal")}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md, gap: spacing.sm },
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.backgroundElevated,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardPressed: {
    opacity: 0.92,
    borderColor: colors.accent,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  eyebrow: {
    ...typography.label,
    color: colors.accent,
  },
  shareBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.accentGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtnDisabled: { opacity: 0.5 },
  reference: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
  },
  verseText: {
    ...typography.verse,
    color: colors.textPrimary,
    fontStyle: "italic",
    lineHeight: 30,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
  },
  statChipMet: {
    borderColor: colors.success,
    backgroundColor: "rgba(52,211,153,0.08)",
  },
  statText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  statTextMet: { color: colors.success },
});

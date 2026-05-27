import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { hapticSuccess } from "@/utils/haptics";
import { colors, radii, spacing, typography } from "@/theme";
import type { VerseWithReference } from "@/types/scripture";

const LIKE_KEY = "@biblia-ai/votd-liked";

function getBaseCount(): number {
  const d = new Date();
  const dayOfYear = Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return 950000 + ((dayOfYear * 2347 + 17823) % 12000);
}

function formatCount(n: number, locale: string): string {
  const thousands = n / 1000;
  const formatted = thousands.toFixed(1);
  return locale === "pl"
    ? `${formatted.replace(".", ",")} tys.`
    : `${formatted}k`;
}

interface SocialState {
  liked: boolean;
  likedDates: string[];
}

interface VotdFeedCardProps {
  onVerse?: (text: string, reference: string) => void;
}

export function VotdFeedCard({ onVerse }: VotdFeedCardProps) {
  const { t, i18n } = useTranslation();
  const locale = useLocaleStore((s) => s.locale) ?? getDeviceLocale();
  const translation = useActiveTranslation(locale);
  const router = useRouter();
  const cardRef = useRef<View>(null);

  const [verse, setVerse] = useState<VerseWithReference | null>(null);
  const [streak, setStreak] = useState(0);
  const [chaptersToday, setChaptersToday] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(1);
  const [liked, setLiked] = useState(false);
  const [sharing, setSharing] = useState(false);

  const todayIso = new Date().toISOString().slice(0, 10);
  const baseCount = getBaseCount();
  const likeCount = baseCount + (liked ? 1 : 0);
  const commentCount = Math.floor(baseCount * 0.0178);

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

      const raw = await AsyncStorage.getItem(LIKE_KEY);
      if (raw) {
        const state = JSON.parse(raw) as SocialState;
        setLiked(state.likedDates.includes(todayIso));
      }

      await recordDailyRead();
    };
    void load();
  }, [locale, onVerse, todayIso, translation]);

  const handleLike = useCallback(async () => {
    const next = !liked;
    setLiked(next);
    void hapticSuccess();

    const raw = await AsyncStorage.getItem(LIKE_KEY);
    const state: SocialState = raw ? (JSON.parse(raw) as SocialState) : { liked: false, likedDates: [] };
    const dates = next
      ? [...new Set([...state.likedDates, todayIso])]
      : state.likedDates.filter((d) => d !== todayIso);
    await AsyncStorage.setItem(LIKE_KEY, JSON.stringify({ liked: next, likedDates: dates }));
  }, [liked, todayIso]);

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

  const openChat = useCallback(() => {
    router.push("/(tabs)/ai");
  }, [router]);

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
      <View ref={cardRef} style={styles.card}>
        <View style={styles.warmOverlay} />

        <Text style={styles.vodLabel}>{t("viralFeed.verseOfDay")}</Text>
        <Pressable onPress={openVerse} accessibilityRole="button">
          <Text style={styles.reference}>{reference}</Text>
          <Text style={styles.verseText}>{verse.text}</Text>
          <Text style={styles.tapHint}>{t("viralFeed.tapToRead")}</Text>
        </Pressable>

        <View style={styles.divider} />

        <View style={styles.socialBar}>
          <Pressable onPress={() => void handleLike()} style={styles.socialBtn} accessibilityRole="button">
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={22}
              color={liked ? colors.danger : colors.textSecondary}
            />
            <Text style={[styles.socialCount, liked && styles.socialCountLiked]}>
              {formatCount(likeCount, locale)}
            </Text>
            <Text style={styles.socialLabel}>{t("viralFeed.likes")}</Text>
          </Pressable>

          <Pressable onPress={openChat} style={styles.socialBtn} accessibilityRole="button">
            <Ionicons name="chatbubble-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.socialCount}>{formatCount(commentCount, locale)}</Text>
            <Text style={styles.socialLabel}>{t("viralFeed.comments")}</Text>
          </Pressable>

          <Pressable
            onPress={() => void handleShare()}
            disabled={sharing}
            style={[styles.socialBtn, sharing && styles.socialBtnDisabled]}
            accessibilityRole="button"
          >
            <Ionicons name="share-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.socialLabel}>{t("viralFeed.share")}</Text>
          </Pressable>

          <Pressable onPress={openChat} style={styles.socialBtn} accessibilityRole="button">
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
            <Text style={styles.socialLabel}>{t("viralFeed.more")}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <Ionicons name="flame" size={14} color={colors.accent} />
          <Text style={styles.statText}>
            {streak} {t("dashboard.dayStreak")}
          </Text>
        </View>
        <View style={[styles.statChip, goalMet && styles.statChipMet]}>
          <Ionicons name="checkmark-circle" size={14} color={goalMet ? colors.success : colors.textMuted} />
          <Text style={[styles.statText, goalMet && styles.statTextMet]}>
            {chaptersToday}/{dailyGoal} {t("dashboard.dailyGoal")}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  card: {
    borderRadius: radii.xl ?? 20,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.backgroundElevated,
    overflow: "hidden",
    padding: spacing.md,
  },
  warmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(229,169,60,0.05)",
  },
  vodLabel: {
    ...typography.label,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  reference: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  verseText: {
    ...typography.verse,
    color: colors.textPrimary,
    fontStyle: "italic",
    lineHeight: 32,
    marginBottom: spacing.xs,
  },
  tapHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(229,169,60,0.25)",
    marginVertical: spacing.sm,
  },
  socialBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: spacing.xs,
  },
  socialBtn: {
    alignItems: "center",
    gap: 3,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  socialBtnDisabled: { opacity: 0.5 },
  socialCount: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "700",
  },
  socialCountLiked: { color: colors.danger },
  socialLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
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

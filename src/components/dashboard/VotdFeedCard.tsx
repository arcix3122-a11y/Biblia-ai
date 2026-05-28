import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getVotdPhotoUrl } from "@/data/photoBackgrounds";
import { PhotoBackground } from "@/components/PhotoBackground";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { captureRef } from "react-native-view-shot";
import { shareVerse } from "@/services/share/shareVerse";
import { getVerseOfTheDay } from "@/services/db/scriptureRepository";
import { getUserStats } from "@/services/stats/userStats";
import {
  buildVerseRef,
  getCommentCount,
  getLikeState,
  isSocialAvailable,
  toggleLike,
} from "@/services/social/votdSocialRepository";
import { useLocaleStore } from "@/store/localeStore";
import { useActiveTranslation } from "@/store/translationStore";
import { formatBookReference } from "@/i18n/bookNames";
import { getDeviceLocale } from "@/i18n";
import { hapticSuccess } from "@/utils/haptics";
import { colors, radii, spacing, typography } from "@/theme";
import type { VerseWithReference } from "@/types/scripture";
import { VotdCommentsSheet } from "./VotdCommentsSheet";

const OFFLINE_LIKE_KEY = "@biblia-ai/votd-liked-offline";

function formatCount(n: number, locale: string): string {
  if (n < 1000) return String(n);
  const thousands = n / 1000;
  const formatted = thousands >= 100 ? thousands.toFixed(0) : thousands.toFixed(1);
  return locale === "pl"
    ? `${formatted.replace(".", ",")} tys.`
    : `${formatted}k`;
}

interface OfflineLikeState {
  likedDates: string[];
}

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
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const todayIso = new Date().toISOString().slice(0, 10);
  const socialAvailable = isSocialAvailable();
  const verseRef = verse ? buildVerseRef(verse.book_slug, verse.chapter_number, verse.number) : null;
  const photoUrl = useMemo(() => getVotdPhotoUrl(900, 1200), [todayIso]);

  useEffect(() => {
    const load = async () => {
      try {
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
      } catch {
        // local DB only — no UI surfacing
      }
    };
    void load();
  }, [locale, onVerse, translation]);

  useEffect(() => {
    if (!verseRef) return;
    let cancelled = false;
    const loadSocial = async () => {
      if (socialAvailable) {
        try {
          const [state, ccount] = await Promise.all([
            getLikeState(verseRef),
            getCommentCount(verseRef),
          ]);
          if (cancelled) return;
          if (state) {
            setLikeCount(state.count);
            setLiked(state.likedByMe);
          }
          setCommentCount(ccount);
        } catch {
          // network issue — leave defaults
        }
      } else {
        try {
          const raw = await AsyncStorage.getItem(OFFLINE_LIKE_KEY);
          if (raw) {
            const state = JSON.parse(raw) as OfflineLikeState;
            if (!cancelled) {
              setLiked(state.likedDates.includes(verseRef));
            }
          }
        } catch {
          // ignore
        }
      }
    };
    void loadSocial();
    return () => {
      cancelled = true;
    };
  }, [socialAvailable, verseRef]);

  const handleLike = useCallback(async () => {
    if (!verseRef) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    void hapticSuccess();

    if (socialAvailable) {
      try {
        await toggleLike(verseRef, next);
      } catch {
        setLiked(!next);
        setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
      }
    } else {
      try {
        const raw = await AsyncStorage.getItem(OFFLINE_LIKE_KEY);
        const state: OfflineLikeState = raw
          ? (JSON.parse(raw) as OfflineLikeState)
          : { likedDates: [] };
        const dates = next
          ? [...new Set([...state.likedDates, verseRef])]
          : state.likedDates.filter((r) => r !== verseRef);
        await AsyncStorage.setItem(OFFLINE_LIKE_KEY, JSON.stringify({ likedDates: dates }));
      } catch {
        // ignore
      }
    }
  }, [liked, socialAvailable, verseRef]);

  const handleShare = useCallback(async () => {
    if (!verse || sharing) return;
    setSharing(true);
    try {
      const reference = formatBookReference(
        verse.book_slug,
        verse.chapter_number,
        verse.number,
        locale,
        verse.book_name
      );
      let imageUri: string | null = null;
      try {
        if (cardRef.current) {
          imageUri = await captureRef(cardRef, { format: "png", quality: 0.95 });
        }
      } catch {
        // image optional — text share still works offline
      }
      await shareVerse(
        {
          reference,
          text: verse.text,
          bookSlug: verse.book_slug,
          chapter: verse.chapter_number,
          verse: verse.number,
        },
        imageUri
      );
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
      <View ref={cardRef} collapsable={false} style={styles.cardCapture}>
        <PhotoBackground
          uri={photoUrl}
          style={styles.card}
          borderRadius={radii.xl}
          scrimOpacity={0.55}
          useLegacyImage
        >
          <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <Text style={styles.eyebrow}>{t("viralFeed.verseOfDay")}</Text>
            <Text style={styles.referenceTag}>{reference}</Text>
          </View>

          <Pressable
            onPress={openVerse}
            accessibilityRole="button"
            accessibilityLabel={`${reference}. ${verse.text}`}
            style={styles.verseBlock}
          >
            <Text style={styles.verseText}>{verse.text}</Text>
            <Text style={styles.tapHint}>{t("viralFeed.tapToRead")}</Text>
          </Pressable>

          <View style={styles.socialBar}>
            <Pressable
              onPress={() => void handleLike()}
              style={styles.socialBtn}
              accessibilityRole="button"
              accessibilityLabel={t("viralFeed.likes")}
            >
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={22}
                color={liked ? colors.danger : colors.textPrimary}
              />
              <Text style={[styles.socialCount, liked && styles.socialCountLiked]}>
                {likeCount > 0 ? formatCount(likeCount, locale) : t("viralFeed.likes")}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setCommentsOpen(true)}
              style={styles.socialBtn}
              accessibilityRole="button"
              accessibilityLabel={t("viralFeed.comments")}
            >
              <Ionicons name="chatbubble-outline" size={20} color={colors.textPrimary} />
              <Text style={styles.socialCount}>
                {commentCount > 0 ? formatCount(commentCount, locale) : t("viralFeed.comments")}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => void handleShare()}
              disabled={sharing}
              style={[styles.socialBtn, sharing && styles.socialBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel={t("viralFeed.share")}
            >
              <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
              <Text style={styles.socialCount}>{t("viralFeed.share")}</Text>
            </Pressable>
          </View>
          </View>
        </PhotoBackground>
      </View>

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

      <VotdCommentsSheet
        visible={commentsOpen}
        verseRef={verseRef}
        reference={reference}
        onClose={() => setCommentsOpen(false)}
        onCountChange={setCommentCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md, gap: spacing.sm },
  cardCapture: {
    borderRadius: radii.xl,
    overflow: "hidden",
  },
  card: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 440,
  },
  cardContent: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: "space-between",
    minHeight: 440,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: {
    ...typography.label,
    color: colors.accent,
  },
  referenceTag: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "700",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },
  verseBlock: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: spacing.lg,
  },
  verseText: {
    fontSize: 24,
    fontWeight: "400",
    lineHeight: 36,
    color: "#FFFFFF",
    fontStyle: "italic",
    fontFamily: Platform.select({ ios: "Georgia", android: "serif", default: undefined }),
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  tapHint: {
    ...typography.caption,
    color: "rgba(255,255,255,0.72)",
    marginTop: spacing.md,
  },
  socialBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  socialBtnDisabled: { opacity: 0.5 },
  socialCount: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  socialCountLiked: { color: colors.danger },
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

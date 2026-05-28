import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionTile } from "@/components/dashboard/ActionTile";
import { ErrorFallback } from "@/components/ErrorFallback";
import { GlassCard } from "@/components/GlassCard";
import { HeroCard } from "@/components/dashboard/HeroCard";
import { DailyMissionHub } from "@/components/dashboard/DailyMissionHub";
import { DailyRhythmCard } from "@/components/dashboard/DailyRhythmCard";
import { MomentumDashboard } from "@/components/dashboard/MomentumDashboard";
import { ReadingPlanCard } from "@/components/dashboard/ReadingPlanCard";
import { GuidedReflectionCards } from "@/components/dashboard/GuidedReflectionCards";
import type { ReflectionVariant } from "@/components/dashboard/GuidedReflectionSheet";
import { LoadingState } from "@/components/layout/LoadingState";
import { VotdFeedCard } from "@/components/dashboard/VotdFeedCard";
import { TopicGrid } from "@/components/topics/TopicGrid";
import { useDatabaseReady } from "@/hooks/useScripture";
import { useBookmarksStore } from "@/store/bookmarksStore";
import { useHistoryStore } from "@/store/historyStore";
import { useSelectionStore } from "@/store/selectionStore";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import { useLocaleStore } from "@/store/localeStore";
import { getDeviceLocale } from "@/i18n";
import { formatBookReference, getBookDisplayName } from "@/i18n/bookNames";
import { getBookPhotoUrl, getCategoryPhotoUrl, HOME_TILE_PHOTOS } from "@/data/photoBackgrounds";
import { formatShortDate } from "@/utils/formatDate";
import { getUserStats } from "@/services/stats/userStats";
import { ReminderFunnelPrompt } from "@/components/notifications/ReminderFunnelPrompt";
import { useReminderStore } from "@/store/reminderStore";
import { colors, radii, spacing, typography } from "@/theme";

function dedupeRecent<T extends { book_slug?: string; chapter: number }>(
  entries: T[],
  max: number
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const entry of entries) {
    const key = `${entry.book_slug ?? ""}-${entry.chapter}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
    if (result.length >= max) break;
  }
  return result;
}

function getGreetingKey(): "viralFeed.greetingMorning" | "viralFeed.greetingAfternoon" | "viralFeed.greetingEvening" {
  const hour = new Date().getHours();
  if (hour < 12) return "viralFeed.greetingMorning";
  if (hour < 17) return "viralFeed.greetingAfternoon";
  return "viralFeed.greetingEvening";
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = useLocaleStore((s) => s.locale) ?? getDeviceLocale();
  const router = useRouter();
  const { ready, error, retry } = useDatabaseReady();
  const lastRead = useHistoryStore((s) => s.lastRead);
  const recent = useHistoryStore((s) => s.recent);
  const loadHistory = useHistoryStore((s) => s.loadHistory);
  const bookmarks = useBookmarksStore((s) => s.bookmarks);
  const loadBookmarks = useBookmarksStore((s) => s.loadBookmarks);
  const [refreshing, setRefreshing] = useState(false);
  const [votdText, setVotdText] = useState("");
  const [votdRef, setVotdRef] = useState("");
  const [pendingReflection, setPendingReflection] = useState<ReflectionVariant | null>(null);
  const [reminderFunnelVisible, setReminderFunnelVisible] = useState(false);
  const reminderEnabled = useReminderStore((s) => s.enabled);
  const reminderFunnelPromptSeen = useReminderStore((s) => s.reminderFunnelPromptSeen);
  const loadReminderPrefs = useReminderStore((s) => s.load);
  const prevMissionCountRef = useRef<number | null>(null);

  useEffect(() => {
    void loadReminderPrefs();
  }, [loadReminderPrefs]);

  const tryShowReminderFunnel = useCallback(() => {
    if (!reminderEnabled && !reminderFunnelPromptSeen) {
      setReminderFunnelVisible(true);
    }
  }, [reminderEnabled, reminderFunnelPromptSeen]);

  useFocusEffect(
    useCallback(() => {
      if (reminderEnabled || reminderFunnelPromptSeen) {
        return;
      }
      void getUserStats().then((stats) => {
        const count = stats.activitiesCompletedCount;
        const prev = prevMissionCountRef.current;
        prevMissionCountRef.current = count;
        if (prev === null) {
          return;
        }
        if (prev === 0 && count >= 1) {
          tryShowReminderFunnel();
        }
      });
    }, [reminderEnabled, reminderFunnelPromptSeen, tryShowReminderFunnel])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadHistory(), loadBookmarks()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadBookmarks, loadHistory]);

  useEffect(() => {
    void loadHistory();
    void loadBookmarks();
  }, [loadHistory, loadBookmarks]);

  useEffect(() => {
    void loadBookmarks();
  }, [loadBookmarks]);

  const recentUnique = useMemo(() => dedupeRecent(recent, 3), [recent]);
  const bookmarkPreview = useMemo(() => bookmarks.slice(0, 2), [bookmarks]);

  const setSelectedVerse = useSelectionStore((s) => s.setSelectedVerse);

  const openReader = useCallback(
    async (bookSlug: string, chapter: number, verseNumber?: number, verseText?: string) => {
      if (verseNumber) {
        const book = await scriptureRepo.getBookBySlug(bookSlug);
        if (book) {
          setSelectedVerse({
            bookId: book.id,
            bookName: getBookDisplayName(book.slug, locale, book.name),
            bookSlug: book.slug,
            chapter,
            verse: verseNumber,
            text: verseText ?? "",
          });
        }
      }
      router.push(
        verseNumber
          ? `/reader/${bookSlug}/${chapter}?verse=${verseNumber}`
          : `/reader/${bookSlug}/${chapter}`
      );
    },
    [locale, router, setSelectedVerse]
  );

  const resumeReading = useCallback(() => {
    if (lastRead?.book_slug) {
      void openReader(lastRead.book_slug, lastRead.chapter, lastRead.verse);
    }
  }, [lastRead, openReader]);

  const startReading = useCallback(() => {
    if (lastRead?.book_slug) {
      resumeReading();
      return;
    }
    router.push("/(tabs)/library");
  }, [lastRead, resumeReading, router]);

  const openTopic = useCallback(
    (slug: string) => {
      router.push(`/topic/${slug}`);
    },
    [router]
  );

  if (error) {
    return <ErrorFallback message={error} onRetry={retry} />;
  }

  if (!ready) {
    return (
      <View style={styles.centered}>
        <LoadingState message={t("home.preparingLibrary")} />
      </View>
    );
  }

  const hasContinue = Boolean(lastRead?.book_slug);
  const heroTitle = hasContinue
    ? formatBookReference(
        lastRead!.book_slug!,
        lastRead!.chapter,
        lastRead!.verse,
        locale,
        lastRead!.book_name ?? t("common.scripture")
      )
    : t("home.welcomeTitle");
  const heroSubtitle = hasContinue
    ? t("home.continueSubtitle")
    : t("home.welcomeSubtitle");
  const heroCta = hasContinue ? t("home.continueReading") : t("home.readNow");
  const heroEyebrow = hasContinue ? t("home.continueReading") : t("common.appName");
  const greetingKey = getGreetingKey();
  const heroPhotoUrl =
    hasContinue && lastRead?.book_slug
      ? getBookPhotoUrl(lastRead.book_slug, 900, 600)
      : getCategoryPhotoUrl("continueReading", 900, 600);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.sm }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.backgroundElevated}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>{t(greetingKey)}</Text>
            <Text style={styles.brand}>{t("common.appName")}</Text>
          </View>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={12}
            style={styles.headerIcon}
            accessibilityLabel={t("home.openSettings")}
          >
            <Ionicons name="settings-outline" size={20} color={colors.accent} />
          </Pressable>
        </View>

        <Text style={styles.sectionHeading}>{t("home.todaySection")}</Text>

        <HeroCard
          eyebrow={heroEyebrow}
          title={heroTitle}
          subtitle={heroSubtitle}
          ctaLabel={heroCta}
          photoUrl={heroPhotoUrl}
          onPress={startReading}
        />

        <MomentumDashboard />

        <DailyRhythmCard />

        <DailyMissionHub
          reflectionAvailable={Boolean(votdText && votdRef)}
          onOpenReflection={() => setPendingReflection("meditation")}
          onFirstMissionCompleted={tryShowReminderFunnel}
        />

        <ReadingPlanCard />

        <VotdFeedCard
          onVerse={(text, ref) => {
            setVotdText(text);
            setVotdRef(ref);
          }}
        />

        <GuidedReflectionCards
          verseText={votdText}
          verseReference={votdRef}
          openVariant={pendingReflection}
          onOpenVariantHandled={() => setPendingReflection(null)}
        />

        <Text style={styles.sectionHeading}>{t("home.exploreHeading")}</Text>
        <ActionTile
          icon="library-outline"
          title={t("home.tileLibrary")}
          subtitle={t("home.tileLibrarySub")}
          layout="horizontal"
          imageUrl={getCategoryPhotoUrl("continueReading", 600, 400)}
          onPress={() => router.push("/(tabs)/library")}
        />
        <ActionTile
          icon="grid-outline"
          title={t("practices.hubTileTitle")}
          subtitle={t("practices.hubTileSub")}
          badge={t("common.new")}
          layout="horizontal"
          imageUrl={getCategoryPhotoUrl("guidedSilence", 600, 400)}
          onPress={() => router.push("/devotional-hub")}
        />
        <View style={styles.tileRow}>
          <ActionTile
            icon="musical-notes-outline"
            title={t("affirmations.homeTileTitle")}
            subtitle={t("affirmations.homeTileSub")}
            badge={t("common.new")}
            imageUrl={HOME_TILE_PHOTOS.affirmations}
            onPress={() => router.push("/affirmations")}
          />
          <ActionTile
            icon="sparkles-outline"
            title={t("home.tileCompanion")}
            subtitle={t("home.tileCompanionSub")}
            imageUrl={HOME_TILE_PHOTOS.companion}
            onPress={() => router.push("/(tabs)/ai")}
          />
        </View>
        <View style={styles.tileRow}>
          <ActionTile
            icon="calendar-outline"
            title={t("home.tilePlan")}
            subtitle={t("home.tilePlanSub")}
            imageUrl={HOME_TILE_PHOTOS.plan}
            onPress={() => router.push("/reading-plan")}
          />
          <ActionTile
            icon="heart-outline"
            title={t("home.tilePrayer")}
            subtitle={t("home.tilePrayerSub")}
            imageUrl={HOME_TILE_PHOTOS.prayer}
            onPress={() => router.push("/guided-prayer")}
          />
        </View>
        <Pressable
          onPress={() => router.push("/stats")}
          style={styles.statsLink}
          accessibilityRole="button"
          accessibilityLabel={t("home.tileStats")}
        >
          <Ionicons name="stats-chart-outline" size={16} color={colors.accent} />
          <Text style={styles.statsLinkText}>{t("home.tileStats")}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>

        {recentUnique.length > 0 || bookmarkPreview.length > 0 ? (
          <>
            <Text style={styles.sectionHeading}>{t("home.discoveryHeading")}</Text>
            {recentUnique.length > 0 ? (
              <View style={styles.subSection}>
                <Text style={styles.subSectionTitle}>{t("home.recentlyRead")}</Text>
                {recentUnique.map((entry) => (
                  <Pressable
                    key={`${entry.id}-${entry.viewed_at}`}
                    onPress={() => {
                      if (entry.book_slug) {
                        void openReader(entry.book_slug, entry.chapter, entry.verse);
                      }
                    }}
                  >
                    <GlassCard style={styles.listRow}>
                      <Text style={styles.listRowTitle}>
                        {formatBookReference(
                          entry.book_slug,
                          entry.chapter,
                          entry.verse,
                          locale,
                          entry.book_name ?? t("common.scripture")
                        )}
                      </Text>
                      <Text style={styles.listRowMeta}>
                        {formatShortDate(entry.viewed_at, locale)}
                      </Text>
                    </GlassCard>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {bookmarkPreview.length > 0 ? (
              <View style={styles.subSection}>
                <View style={styles.subSectionRow}>
                  <Text style={styles.subSectionTitle}>{t("home.bookmarks")}</Text>
                  <Pressable onPress={() => router.push("/(tabs)/workspace")}>
                    <Text style={styles.subSectionAction}>{t("common.seeAll")}</Text>
                  </Pressable>
                </View>
                {bookmarkPreview.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      if (item.book_slug) {
                        void openReader(
                          item.book_slug,
                          item.chapter,
                          item.verse,
                          item.verse_text ?? ""
                        );
                      }
                    }}
                  >
                    <GlassCard style={styles.listRow}>
                      <Text style={styles.listRowTitle}>
                        {formatBookReference(
                          item.book_slug,
                          item.chapter,
                          item.verse,
                          locale,
                          item.book_name ?? t("common.scripture")
                        )}
                      </Text>
                    </GlassCard>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        <TopicGrid onTopicPress={openTopic} />
      </ScrollView>
      <ReminderFunnelPrompt
        visible={reminderFunnelVisible}
        onClose={() => setReminderFunnelVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  headerCopy: {
    flex: 1,
  },
  greeting: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  brand: {
    ...typography.label,
    color: colors.accent,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeading: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  tileRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
  },
  statsLinkText: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
    fontWeight: "600",
  },
  subSection: {
    marginBottom: spacing.sm,
  },
  subSectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.4,
  },
  subSectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  subSectionAction: {
    ...typography.caption,
    color: colors.accent,
  },
  listRow: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
  },
  listRowTitle: {
    ...typography.subtitle,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  listRowMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
});

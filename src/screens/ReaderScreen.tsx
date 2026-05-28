import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getBookPhotoUrl } from "@/data/photoBackgrounds";
import { formatBookReference, getBookDisplayName } from "@/i18n/bookNames";
import { useLocaleStore } from "@/store/localeStore";
import { useActiveTranslation } from "@/store/translationStore";
import { ErrorFallback } from "@/components/ErrorFallback";
import { LoadingState } from "@/components/layout/LoadingState";
import { FontControls } from "@/components/reader/FontControls";
import {
  READER_HERO_COLLAPSE_SCROLL,
  ReaderHeroHeader,
} from "@/components/reader/ReaderHeroHeader";
import { ReadingCanvas } from "@/components/reader/ReadingCanvas";
import { VerseRow } from "@/components/VerseRow";
import { useChrome } from "@/context/ChromeContext";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useBook, useChapterVerses, useDatabaseReady } from "@/hooks/useScripture";
import { useChapterTTS } from "@/hooks/useChapterTTS";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import { ShareVerseCard } from "@/components/dashboard/ShareVerseCard";
import { HighlightColorPicker } from "@/components/reader/HighlightColorPicker";
import { useHighlights } from "@/hooks/useHighlights";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { captureVerseStory } from "@/services/share/verseImageExporter";
import { shareVerse } from "@/services/share/shareVerse";
import { recordChapterRead } from "@/services/stats/userStats";
import { useHistoryStore } from "@/store/historyStore";
import { useOnboardingStore } from "@/store/onboardingStore";
import { useReaderStore } from "@/store/readerStore";
import { useSelectionStore } from "@/store/selectionStore";
import { animations, colors, radii, spacing, typography } from "@/theme";
import { hapticLight } from "@/utils/haptics";
import type { Verse } from "@/types/scripture";

export default function ReaderScreen() {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const translation = useActiveTranslation(locale);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setTabBarHidden } = useChrome();
  const chromeOpacity = useRef(new Animated.Value(1)).current;
  const { bookSlug, chapter: chapterParam, verse: verseParam } = useLocalSearchParams<{
    bookSlug: string;
    chapter: string;
    verse?: string;
  }>();
  const slug = typeof bookSlug === "string" ? bookSlug : "";
  const chapterNumber = Number(chapterParam) || 1;
  const verseFromRoute = verseParam ? Number(verseParam) : undefined;

  const reducedMotion = useReducedMotion();
  const { ready, error: dbError, retry: retryDatabase } = useDatabaseReady();
  const { book, loading: bookLoading } = useBook(slug);
  const { verses, loading: versesLoading } = useChapterVerses(book?.id, chapterNumber);
  const { fontSize, increaseFont, decreaseFont, immersiveMode, toggleImmersiveMode } =
    useReaderStore();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { getHighlightColor, setHighlight, clearHighlight } = useHighlights();
  const recordPosition = useHistoryStore((s) => s.recordPosition);
  const hasDismissedKjvBanner = useOnboardingStore((s) => s.hasDismissedKjvBanner);
  const dismissKjvBanner = useOnboardingStore((s) => s.dismissKjvBanner);
  const selectedVerse = useSelectionStore((s) => s.selectedVerse);
  const setSelectedVerse = useSelectionStore((s) => s.setSelectedVerse);

  const flatListRef = useRef<FlatList<Verse>>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const shareRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const chapterKey = `${slug}-${chapterNumber}`;
  const tts = useChapterTTS(verses, translation, chapterKey);

  useEffect(() => {
    scrollY.setValue(0);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [chapterKey, scrollY]);

  useEffect(() => {
    setTabBarHidden(immersiveMode);
    Animated.timing(chromeOpacity, {
      toValue: immersiveMode ? 0 : 1,
      duration: reducedMotion ? 0 : animations.immersiveFade.duration,
      easing: animations.immersiveFade.easing,
      useNativeDriver: true,
    }).start();
    return () => setTabBarHidden(false);
  }, [chromeOpacity, immersiveMode, reducedMotion, setTabBarHidden]);

  const scrollTargetVerse = useMemo(() => {
    if (
      selectedVerse &&
      book &&
      selectedVerse.bookId === book.id &&
      selectedVerse.chapter === chapterNumber
    ) {
      return selectedVerse.verse;
    }
    if (verseFromRoute && Number.isFinite(verseFromRoute)) {
      return verseFromRoute;
    }
    return undefined;
  }, [book, chapterNumber, selectedVerse, verseFromRoute]);

  // Auto-scroll to selected or deep-linked verse
  useEffect(() => {
    if (scrollTargetVerse && book && verses.length > 0) {
      const index = verses.findIndex((v) => v.number === scrollTargetVerse);
      if (index !== -1) {
        const timer = setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index,
            animated: !reducedMotion,
            viewPosition: 0.3,
          });
        }, reducedMotion ? 0 : 350);
        return () => clearTimeout(timer);
      }
    }
  }, [book, reducedMotion, scrollTargetVerse, verses]);

  useEffect(() => {
    if (book && verses.length > 0) {
      void recordPosition(book.id, chapterNumber, verses[0]?.number ?? 1);
      void recordChapterRead(book.slug, chapterNumber);
    }
  }, [book, chapterNumber, recordPosition, verses]);

  const navigateChapter = useCallback(
    async (direction: "prev" | "next") => {
      if (!book) {
        return;
      }
      void hapticLight();
      const adjacent = await scriptureRepo.getAdjacentChapter(
        book.id,
        chapterNumber,
        direction
      );
      if (adjacent) {
        router.replace(`/reader/${book.slug}/${adjacent.number}`);
      }
    },
    [book, chapterNumber, router]
  );

  const selectVerse = useCallback(
    (verseNumber: number, text: string) => {
      if (!book) {
        return;
      }
      setSelectedVerse({
        bookId: book.id,
        bookName: getBookDisplayName(book.slug, locale, book.name),
        bookSlug: book.slug,
        chapter: chapterNumber,
        verse: verseNumber,
        text,
      });
    },
    [book, chapterNumber, locale, setSelectedVerse]
  );

  const selectedVerseId = selectedVerse
    ? verses.find((v) => v.number === selectedVerse.verse)?.id
    : undefined;

  const onShareSelectedVerse = useCallback(async () => {
    if (!selectedVerse || sharing || !book) {
      return;
    }
    setSharing(true);
    try {
      const reference = formatBookReference(
        book.slug,
        chapterNumber,
        selectedVerse.verse,
        locale,
        book.name
      );
      let imageUri: string | null = null;
      try {
        imageUri = await captureVerseStory(shareRef);
      } catch {
        // image optional
      }
      await shareVerse(
        {
          reference,
          text: selectedVerse.text,
          bookSlug: book.slug,
          chapter: chapterNumber,
          verse: selectedVerse.verse,
        },
        imageUri
      );
    } catch {
      // share cancelled
    } finally {
      setSharing(false);
    }
  }, [book, chapterNumber, locale, selectedVerse, sharing]);

  const renderVerse = useCallback(
    ({ item }: { item: Verse }) => (
      <VerseRow
        verse={item}
        fontSize={fontSize}
        isBookmarked={isBookmarked(item.id)}
        isSelected={
          selectedVerse != null &&
          book != null &&
          selectedVerse.bookId === book.id &&
          selectedVerse.chapter === chapterNumber &&
          selectedVerse.verse === item.number
        }
        highlightColor={getHighlightColor(item.id)}
        onPress={() => selectVerse(item.number, item.text)}
        onLongPress={() => selectVerse(item.number, item.text)}
        onToggleBookmark={() =>
          book ? void toggleBookmark(item.id, book.id, chapterNumber, item.number) : undefined
        }
      />
    ),
    [
      book,
      chapterNumber,
      fontSize,
      getHighlightColor,
      isBookmarked,
      selectVerse,
      selectedVerse,
      toggleBookmark,
    ]
  );

  const bookDisplayName = book
    ? getBookDisplayName(book.slug, locale, book.name)
    : "";
  const showEnglishNotice =
    book != null && translation === "en" && locale === "pl" && !hasDismissedKjvBanner;
  const translationLabel = useMemo(() => {
    const translationName =
      translation === "pl"
        ? t("settings.translation.plName")
        : t("settings.translation.enName");
    return t("reader.translationLabel", { name: translationName });
  }, [t, translation]);

  const readerHeroPhotoExpanded = useMemo(
    () => (book ? getBookPhotoUrl(book.slug, 900, 480) : ""),
    [book?.slug]
  );
  const readerHeroPhotoCollapsed = useMemo(
    () => (book ? getBookPhotoUrl(book.slug, 900, 120) : ""),
    [book?.slug]
  );

  const stickyOpacity = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [READER_HERO_COLLAPSE_SCROLL, READER_HERO_COLLAPSE_SCROLL + 48],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
    [scrollY]
  );

  const listHeader = useMemo(() => {
    if (!book || immersiveMode) {
      return null;
    }
    return (
      <ReaderHeroHeader
        photoUrl={readerHeroPhotoExpanded}
        bookDisplayName={bookDisplayName}
        chapterNumber={chapterNumber}
        flowSubtitle={t("reader.flowSubtitle")}
        translationLabel={translationLabel}
        showTranslationNotice={showEnglishNotice}
        translationNoticeText={t("reader.scriptureTranslationNoticeShort")}
        dismissTranslationNoticeA11y={t("reader.dismissTranslationNotice")}
        onDismissTranslationNotice={dismissKjvBanner}
      />
    );
  }, [
    book,
    bookDisplayName,
    chapterNumber,
    dismissKjvBanner,
    immersiveMode,
    readerHeroPhotoExpanded,
    showEnglishNotice,
    t,
    translationLabel,
  ]);

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY]
  );

  if (!ready || bookLoading || versesLoading) {
    return (
      <View style={styles.centered}>
        <LoadingState message={t("common.loading")} />
      </View>
    );
  }

  if (dbError) {
    return <ErrorFallback message={dbError} onRetry={retryDatabase} />;
  }

  if (!book) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{t("reader.bookNotFound")}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: immersiveMode ? insets.top : 0 }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {!immersiveMode ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.stickyHeroBar,
            {
              opacity: stickyOpacity,
              paddingTop: insets.top + 40,
            },
          ]}
        >
          <ReaderHeroHeader
            photoUrl={readerHeroPhotoCollapsed}
            bookDisplayName={bookDisplayName}
            chapterNumber={chapterNumber}
            flowSubtitle={t("reader.flowSubtitle")}
            translationLabel={translationLabel}
            collapsed
          />
        </Animated.View>
      ) : null}

      {!immersiveMode ? (
        <Animated.View
          style={[
            styles.topBar,
            {
              opacity: chromeOpacity,
              paddingTop: insets.top + spacing.xs,
            },
          ]}
        >
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
            <Ionicons name="chevron-back" size={16} color={colors.accent} />
            <Text style={styles.back}>{t("common.back")}</Text>
          </Pressable>
          <View style={styles.topBarRight}>
            <Pressable
              onPress={tts.toggle}
              hitSlop={10}
              style={[styles.ttsButton, tts.isPlaying && styles.ttsButtonActive]}
              accessibilityRole="button"
              accessibilityLabel={
                tts.isPlaying ? t("reader.stopReading") : t("reader.readAloud")
              }
            >
              <Ionicons
                name={tts.isPlaying ? "pause" : "volume-high-outline"}
                size={14}
                color={tts.isPlaying ? colors.canvas : colors.accent}
              />
              <Text
                style={[styles.ttsButtonText, tts.isPlaying && styles.ttsButtonTextActive]}
              >
                {tts.isPlaying ? t("reader.stopReading") : t("reader.readAloud")}
              </Text>
            </Pressable>
            <FontControls
              fontSize={fontSize}
              onIncrease={increaseFont}
              onDecrease={decreaseFont}
            />
          </View>
        </Animated.View>
      ) : null}

      <ReadingCanvas fontSize={fontSize} style={styles.canvas}>
        <Animated.FlatList
          ref={flatListRef}
          data={verses}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderVerse}
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.verseList}
          showsVerticalScrollIndicator={!immersiveMode}
          ListHeaderComponent={listHeader}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: !reducedMotion,
                viewPosition: 0.3,
              });
            }, reducedMotion ? 0 : 100);
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>{t("reader.chapterUnavailable")}</Text>
          }
        />
      </ReadingCanvas>

      {!immersiveMode ? (
        <Animated.View
          style={[
            styles.floatingBottom,
            {
              opacity: chromeOpacity,
              paddingBottom: insets.bottom + spacing.sm,
            },
          ]}
        >
          {selectedVerse ? (
            <View style={styles.selectionDock}>
              <Text style={styles.selectionRef} numberOfLines={1}>
                {formatBookReference(
                  selectedVerse.bookSlug,
                  selectedVerse.chapter,
                  selectedVerse.verse,
                  locale,
                  selectedVerse.bookName
                )}
              </Text>
              {selectedVerseId ? (
                <HighlightColorPicker
                  activeColor={getHighlightColor(selectedVerseId)}
                  onSelect={(color) => void setHighlight(selectedVerseId, color)}
                  onClear={() => void clearHighlight(selectedVerseId)}
                />
              ) : null}
              <View style={styles.selectionActionsCompact}>
                <Pressable onPress={() => router.push("/study")} style={styles.selectionIconBtn}>
                  <Ionicons name="school-outline" size={15} color={colors.accent} />
                </Pressable>
                <Pressable onPress={() => router.push("/ai")} style={styles.selectionIconBtn}>
                  <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.accent} />
                </Pressable>
                <Pressable onPress={() => router.push("/workspace")} style={styles.selectionIconBtn}>
                  <Ionicons name="journal-outline" size={15} color={colors.accent} />
                </Pressable>
                <Pressable
                  onPress={() => void onShareSelectedVerse()}
                  disabled={sharing}
                  style={styles.selectionIconBtn}
                >
                  <Ionicons name="share-outline" size={15} color={colors.accent} />
                </Pressable>
                <Pressable onPress={() => setSelectedVerse(null)} style={styles.selectionIconBtn}>
                  <Ionicons name="close-outline" size={15} color={colors.textMuted} />
                </Pressable>
              </View>
              <View style={styles.offscreen} pointerEvents="none">
                <ShareVerseCard
                  ref={shareRef}
                  reference={formatBookReference(
                    selectedVerse.bookSlug,
                    selectedVerse.chapter,
                    selectedVerse.verse,
                    locale,
                    selectedVerse.bookName
                  )}
                  text={selectedVerse.text}
                />
              </View>
            </View>
          ) : null}

          <View style={styles.navPill}>
            <Pressable onPress={() => void navigateChapter("prev")} style={styles.navIconButton}>
              <Ionicons name="chevron-back" size={15} color={colors.textSecondary} />
            </Pressable>
            <Pressable onLongPress={toggleImmersiveMode} style={styles.navCenter}>
              <Text style={styles.navPillText} numberOfLines={1}>
                {bookDisplayName} {chapterNumber}
                </Text>
            </Pressable>
            <Pressable onPress={() => void navigateChapter("next")} style={styles.navIconButton}>
              <Ionicons name="chevron-forward" size={15} color={colors.textSecondary} />
            </Pressable>
          </View>
        </Animated.View>
      ) : (
        <Pressable
          style={[styles.immersiveExit, { bottom: insets.bottom + spacing.md }]}
          onPress={toggleImmersiveMode}
        >
          <Text style={styles.immersiveExitText}>{t("reader.exitImmersive")}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  canvas: {
    flex: 1,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.pill,
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  back: {
    ...typography.caption,
    color: colors.accent,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  ttsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.pill,
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  ttsButtonActive: {
    backgroundColor: colors.accent,
  },
  ttsButtonText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.3,
  },
  ttsButtonTextActive: {
    color: colors.canvas,
  },
  stickyHeroBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 6,
  },
  verseList: {
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.xxl * 2.2,
    paddingHorizontal: spacing.sm,
  },
  floatingBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: spacing.md,
    zIndex: 4,
  },
  navPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    minWidth: 210,
  },
  navIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  navCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navPillText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  error: {
    ...typography.body,
    color: colors.danger,
  },
  immersiveExit: {
    position: "absolute",
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
  },
  immersiveExitText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  selectionDock: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
    minWidth: 230,
    alignItems: "center",
  },
  selectionRef: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  selectionActionsCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  selectionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  offscreen: {
    position: "absolute",
    left: -9999,
    top: 0,
    opacity: 0,
  },
});

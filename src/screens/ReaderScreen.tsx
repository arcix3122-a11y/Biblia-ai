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
import { ErrorFallback } from "@/components/ErrorFallback";
import { GlassChrome } from "@/components/GlassChrome";
import { LoadingState } from "@/components/layout/LoadingState";
import { ImmersiveModeToggle } from "@/components/reader/ImmersiveModeToggle";
import { FontControls } from "@/components/reader/FontControls";
import { ReadingCanvas } from "@/components/reader/ReadingCanvas";
import { CrossReferencesPanel } from "@/components/reader/CrossReferencesPanel";
import { VerseRow } from "@/components/VerseRow";
import { useChrome } from "@/context/ChromeContext";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useBook, useChapterVerses, useDatabaseReady } from "@/hooks/useScripture";
import { audioEngine } from "@/services/audio/audioEngine";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import { ShareVerseCard } from "@/components/dashboard/ShareVerseCard";
import { HighlightColorPicker } from "@/components/reader/HighlightColorPicker";
import { useHighlights } from "@/hooks/useHighlights";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { captureVerseStory, shareVerseImage } from "@/services/share/verseImageExporter";
import { recordChapterRead } from "@/services/stats/userStats";
import { useHistoryStore } from "@/store/historyStore";
import { useReaderStore } from "@/store/readerStore";
import { useSelectionStore } from "@/store/selectionStore";
import { animations, colors, radii, spacing, typography } from "@/theme";
import { hapticLight } from "@/utils/haptics";
import type { Verse } from "@/types/scripture";

export default function ReaderScreen() {
  const { t } = useTranslation();
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
  const selectedVerse = useSelectionStore((s) => s.selectedVerse);
  const setSelectedVerse = useSelectionStore((s) => s.setSelectedVerse);

  const flatListRef = useRef<FlatList>(null);
  const shareRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

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
        bookName: book.name,
        bookSlug: book.slug,
        chapter: chapterNumber,
        verse: verseNumber,
        text,
      });
    },
    [book, chapterNumber, setSelectedVerse]
  );

  const loadAudioPreview = useCallback(async () => {
    if (!book) {
      return;
    }
    await audioEngine.load({
      bookId: book.id,
      bookName: book.name,
      bookSlug: book.slug,
      chapter: chapterNumber,
    });
    await audioEngine.play();
  }, [book, chapterNumber]);

  const selectedVerseId = selectedVerse
    ? verses.find((v) => v.number === selectedVerse.verse)?.id
    : undefined;

  const onShareSelectedVerse = useCallback(async () => {
    if (!selectedVerse || sharing) {
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
  }, [selectedVerse, sharing]);

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
        <GlassChrome sticky style={{ paddingTop: insets.top }}>
          <Animated.View style={[styles.toolbar, { opacity: chromeOpacity }]}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={styles.back}>← {t("common.back")}</Text>
            </Pressable>
            <Text style={styles.heading}>
              {book.name} {chapterNumber}
            </Text>
            <FontControls
              fontSize={fontSize}
              onIncrease={increaseFont}
              onDecrease={decreaseFont}
            />
          </Animated.View>
        </GlassChrome>
      ) : null}

      <ReadingCanvas fontSize={fontSize} style={styles.canvas}>
        <FlatList
          ref={flatListRef}
          data={verses}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderVerse}
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          contentContainerStyle={styles.verseList}
          showsVerticalScrollIndicator={!immersiveMode}
          ListHeaderComponent={
            !immersiveMode ? (
              <View style={styles.translationNotice}>
                <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
                <Text style={styles.translationNoticeText}>
                  {t("reader.scriptureTranslationNotice")}
                </Text>
              </View>
            ) : null
          }
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
          ListFooterComponent={
            !immersiveMode ? (
              <CrossReferencesPanel bookSlug={book.slug} chapter={chapterNumber} />
            ) : null
          }
        />
      </ReadingCanvas>

      {!immersiveMode ? (
        <Animated.View
          style={[
            styles.bottomChrome,
            {
              opacity: chromeOpacity,
              paddingBottom: insets.bottom + spacing.sm,
            },
          ]}
        >
          {selectedVerse ? (
            <View style={styles.selectionBar}>
              <View style={styles.selectionTextRow}>
                <Ionicons name="sparkles" size={14} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={styles.selectionRef} numberOfLines={1}>
                  {t("reader.selected", {
                    reference: `${selectedVerse.bookName} ${selectedVerse.chapter}:${selectedVerse.verse}`,
                  })}
                </Text>
              </View>
              {selectedVerseId ? (
                <HighlightColorPicker
                  activeColor={getHighlightColor(selectedVerseId)}
                  onSelect={(color) => void setHighlight(selectedVerseId, color)}
                  onClear={() => void clearHighlight(selectedVerseId)}
                />
              ) : null}

              {/* Premium Deep Scripture Study Button */}
              <Pressable
                onPress={() => router.push("/study")}
                style={styles.selectionBtnPrimary}
              >
                <Ionicons name="school-outline" size={16} color={colors.canvas} style={{ marginRight: 6 }} />
                <Text style={styles.selectionBtnTextPrimary}>
                  {t("reader.deepStudy") || "Deep Scripture Study"}
                </Text>
              </Pressable>

              <View style={styles.selectionActions}>
                <Pressable
                  onPress={() => void onShareSelectedVerse()}
                  disabled={sharing}
                  style={styles.selectionBtn}
                >
                  <Ionicons name="share-outline" size={16} color={colors.accent} />
                  <Text style={styles.selectionBtnText}>
                    {sharing ? t("common.preparing") : t("reader.shareVerse")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push("/ai")}
                  style={styles.selectionBtn}
                >
                  <Ionicons name="chatbubble-ellipses" size={16} color={colors.accent} />
                  <Text style={styles.selectionBtnText}>{t("reader.aiAssistant")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push("/study")}
                  style={styles.selectionBtn}
                >
                  <Ionicons name="school-outline" size={16} color={colors.accent} />
                  <Text style={styles.selectionBtnText}>{t("study.studyAction")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push("/workspace")}
                  style={styles.selectionBtn}
                >
                  <Ionicons name="journal" size={16} color={colors.accent} />
                  <Text style={styles.selectionBtnText}>{t("reader.notebook")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelectedVerse(null)}
                  style={[styles.selectionBtn, { borderColor: "rgba(239, 68, 68, 0.2)" }]}
                >
                  <Ionicons name="close-circle" size={16} color={colors.danger} />
                  <Text style={[styles.selectionBtnText, { color: colors.danger }]}>
                    {t("common.cancel")}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.offscreen} pointerEvents="none">
                <ShareVerseCard
                  ref={shareRef}
                  reference={`${selectedVerse.bookName} ${selectedVerse.chapter}:${selectedVerse.verse}`}
                  text={selectedVerse.text}
                />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.bottomRow}>
                <ImmersiveModeToggle
                  immersive={immersiveMode}
                  onToggle={toggleImmersiveMode}
                  chromeOpacity={chromeOpacity}
                />
                <Pressable onPress={() => void loadAudioPreview()} style={styles.audioStub}>
                  <Text style={styles.audioStubText}>{t("reader.listen")}</Text>
                </Pressable>
              </View>
              <View style={styles.nav}>
                <Pressable onPress={() => void navigateChapter("prev")} style={styles.navButton}>
                  <Text style={styles.navText}>{t("reader.previous")}</Text>
                </Pressable>
                <Pressable onPress={() => void navigateChapter("next")} style={styles.navButton}>
                  <Text style={styles.navText}>{t("reader.next")}</Text>
                </Pressable>
              </View>
            </>
          )}
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
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  back: {
    ...typography.caption,
    color: colors.accent,
    minWidth: 56,
  },
  heading: {
    ...typography.subtitle,
    color: colors.textPrimary,
    flex: 1,
    textAlign: "center",
  },
  verseList: {
    paddingBottom: spacing.xxl * 2,
  },
  bottomChrome: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  audioStub: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  audioStubText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  navButton: {
    padding: spacing.sm,
  },
  navText: {
    ...typography.subtitle,
    color: colors.accent,
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
  selectionBar: {
    paddingVertical: spacing.xs,
  },
  selectionTextRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    justifyContent: "center",
  },
  selectionRef: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
  },
  selectionActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  selectionBtn: {
    flexGrow: 1,
    flexBasis: "45%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.bubbleUser,
  },
  selectionBtnText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  selectionBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.xs,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  selectionBtnTextPrimary: {
    ...typography.caption,
    color: colors.canvas,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  translationNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  translationNoticeText: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },
  offscreen: {
    position: "absolute",
    left: -9999,
    top: 0,
    opacity: 0,
  },
});

import React, { useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassChrome } from "@/components/GlassChrome";
import { ImmersiveModeToggle } from "@/components/reader/ImmersiveModeToggle";
import { FontControls } from "@/components/reader/FontControls";
import { ReadingCanvas } from "@/components/reader/ReadingCanvas";
import { VerseRow } from "@/components/VerseRow";
import { useChrome } from "@/context/ChromeContext";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useBook, useChapterVerses, useDatabaseReady } from "@/hooks/useScripture";
import { audioEngine } from "@/services/audio/audioEngine";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import { recordDailyRead } from "@/services/stats/userStats";
import { useHistoryStore } from "@/store/historyStore";
import { useReaderStore } from "@/store/readerStore";
import { useSelectionStore } from "@/store/selectionStore";
import { animations, colors, radii, spacing, typography } from "@/theme";

export default function ReaderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setTabBarHidden } = useChrome();
  const chromeOpacity = useRef(new Animated.Value(1)).current;
  const { bookSlug, chapter: chapterParam } = useLocalSearchParams<{
    bookSlug: string;
    chapter: string;
  }>();
  const slug = typeof bookSlug === "string" ? bookSlug : "";
  const chapterNumber = Number(chapterParam) || 1;

  const { ready, error: dbError } = useDatabaseReady();
  const { book, loading: bookLoading } = useBook(slug);
  const { verses, loading: versesLoading } = useChapterVerses(book?.id, chapterNumber);
  const { fontSize, increaseFont, decreaseFont, immersiveMode, toggleImmersiveMode } =
    useReaderStore();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const recordPosition = useHistoryStore((s) => s.recordPosition);
  const selectedVerse = useSelectionStore((s) => s.selectedVerse);
  const setSelectedVerse = useSelectionStore((s) => s.setSelectedVerse);

  useEffect(() => {
    setTabBarHidden(immersiveMode);
    Animated.timing(chromeOpacity, {
      toValue: immersiveMode ? 0 : 1,
      duration: animations.immersiveFade.duration,
      easing: animations.immersiveFade.easing,
      useNativeDriver: true,
    }).start();
    return () => setTabBarHidden(false);
  }, [chromeOpacity, immersiveMode, setTabBarHidden]);

  useEffect(() => {
    if (book && verses.length > 0) {
      void recordPosition(book.id, chapterNumber, verses[0]?.number ?? 1);
      void recordDailyRead();
    }
  }, [book, chapterNumber, recordPosition, verses]);

  const navigateChapter = useCallback(
    async (direction: "prev" | "next") => {
      if (!book) {
        return;
      }
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

  if (!ready || bookLoading || versesLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (dbError || !book) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{dbError ?? "Book not found."}</Text>
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
              <Text style={styles.back}>← Back</Text>
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
          data={verses}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.verseList}
          showsVerticalScrollIndicator={!immersiveMode}
          renderItem={({ item }) => (
            <VerseRow
              verse={item}
              fontSize={fontSize}
              isBookmarked={isBookmarked(item.id)}
              isSelected={
                selectedVerse?.bookId === book.id &&
                selectedVerse.chapter === chapterNumber &&
                selectedVerse.verse === item.number
              }
              onPress={() => selectVerse(item.number, item.text)}
              onLongPress={() => selectVerse(item.number, item.text)}
              onToggleBookmark={() =>
                void toggleBookmark(item.id, book.id, chapterNumber, item.number)
              }
            />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              This chapter is not available in the local library yet.
            </Text>
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
                  Zaznaczono: {selectedVerse.bookName} {selectedVerse.chapter}:{selectedVerse.verse}
                </Text>
              </View>
              <View style={styles.selectionActions}>
                <Pressable
                  onPress={() => router.push("/ai")}
                  style={styles.selectionBtn}
                >
                  <Ionicons name="chatbubble-ellipses" size={16} color={colors.accent} />
                  <Text style={styles.selectionBtnText}>Asystent AI</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push("/workspace")}
                  style={styles.selectionBtn}
                >
                  <Ionicons name="journal" size={16} color={colors.accent} />
                  <Text style={styles.selectionBtnText}>Notatnik</Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelectedVerse(null)}
                  style={[styles.selectionBtn, { borderColor: "rgba(239, 68, 68, 0.2)" }]}
                >
                  <Ionicons name="close-circle" size={16} color={colors.danger} />
                  <Text style={[styles.selectionBtnText, { color: colors.danger }]}>Anuluj</Text>
                </Pressable>
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
                  <Text style={styles.audioStubText}>Listen</Text>
                </Pressable>
              </View>
              <View style={styles.nav}>
                <Pressable onPress={() => void navigateChapter("prev")} style={styles.navButton}>
                  <Text style={styles.navText}>Previous</Text>
                </Pressable>
                <Pressable onPress={() => void navigateChapter("next")} style={styles.navButton}>
                  <Text style={styles.navText}>Next</Text>
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
          <Text style={styles.immersiveExitText}>Exit immersive</Text>
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
    gap: spacing.sm,
  },
  selectionBtn: {
    flex: 1,
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
});

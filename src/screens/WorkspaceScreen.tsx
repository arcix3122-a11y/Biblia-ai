import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Sharing from "expo-sharing";
import { useNotesStore, Note } from "@/store/notesStore";
import { useBookmarksStore } from "@/store/bookmarksStore";
import { useSelectionStore } from "@/store/selectionStore";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import { colors, radii, spacing, typography } from "@/theme";
import { GlassCard } from "@/components/GlassCard";
import { useLocaleStore } from "@/store/localeStore";
import { formatBookReference, getBookDisplayName } from "@/i18n/bookNames";
import { formatNoteDate, formatSavedDate } from "@/utils/formatDate";

export default function WorkspaceScreen() {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Note Store
  const { notes, isLoading: isNotesLoading, loadNotes, saveNote, deleteNote } = useNotesStore();
  
  // Bookmarks Store
  const { bookmarks, isLoading: isBookmarksLoading, loadBookmarks, toggleBookmark } = useBookmarksStore();
  
  // Selection Store
  const selectedVerse = useSelectionStore((s) => s.selectedVerse);
  const setSelectedVerse = useSelectionStore((s) => s.setSelectedVerse);

  // Top Level Workspace Tab: "notes" | "bookmarks"
  const [workspaceTab, setWorkspaceTab] = useState<"notes" | "bookmarks">("notes");

  // States for Note Editor
  const [searchQuery, setSearchQuery] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"edit" | "preview">("edit");

  // Initial load
  useEffect(() => {
    void loadNotes();
    void loadBookmarks();
  }, [loadNotes, loadBookmarks]);

  // Note Actions
  const handleCreateNewNote = useCallback(() => {
    setEditingNoteId(null);
    setTitle("");
    if (selectedVerse) {
      const abbrMap: Record<string, string> = {
        genesis: "Rdz",
        psalms: "Ps",
        john: "J",
        romans: "Rz",
      };
      const abbr = abbrMap[selectedVerse.bookSlug] || selectedVerse.bookName;
      const reference = `${abbr} ${selectedVerse.chapter}:${selectedVerse.verse}`;
      setBody(
        t("workspace.noteTemplate", {
          reference,
          text: selectedVerse.text,
        })
      );
    } else {
      setBody("");
    }
    setActiveSubTab("edit");
  }, [selectedVerse, t]);

  const handleEditNote = useCallback((note: Note) => {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setBody(note.body);
    setActiveSubTab("edit");
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle && !body.trim()) {
      setEditingNoteId(null);
      return;
    }

    const savedTitle = trimmedTitle || t("common.untitled");
    const savedId = await saveNote(editingNoteId, savedTitle, body);
    setEditingNoteId(savedId);
    Alert.alert(t("common.success"), t("workspace.noteSaved"));
  }, [body, editingNoteId, saveNote, t, title]);

  const handleDelete = useCallback(() => {
    if (!editingNoteId) return;

    Alert.alert(
      t("workspace.deleteNoteTitle"),
      t("workspace.deleteNoteMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            await deleteNote(editingNoteId);
            setEditingNoteId(null);
            setTitle("");
            setBody("");
          },
        },
      ]
    );
  }, [deleteNote, editingNoteId, t]);

  const handleBackToList = useCallback(async () => {
    if (title.trim() || body.trim()) {
      const trimmedTitle = title.trim() || t("common.untitled");
      await saveNote(editingNoteId, trimmedTitle, body);
    }
    setEditingNoteId(null);
    setTitle("");
    setBody("");
  }, [body, editingNoteId, saveNote, t, title]);

  const handleShareNote = useCallback(async () => {
    const safeTitle = title.trim() || t("common.untitled");
    const safeBody = body.trim() || t("common.noContent");
    const shareText = `${safeTitle}\n\n${safeBody}\n\n— Biblia AI`;

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return;
    }
    await Share.share({ message: shareText, title: safeTitle });
  }, [body, t, title]);

  // Navigating to verse
  const handleLinkPress = useCallback(
    async (bookSlug: string, chapter: number, verse: number) => {
      try {
        const book = await scriptureRepo.getBookBySlug(bookSlug);
        if (book) {
          const chapterObj = await scriptureRepo.getChapter(book.id, chapter);
          let verseText = "";
          if (chapterObj) {
            const verses = await scriptureRepo.getVersesByChapterId(chapterObj.id);
            const matchVerse = verses.find((v) => v.number === verse);
            if (matchVerse) {
              verseText = matchVerse.text;
            }
          }

          setSelectedVerse({
            bookId: book.id,
            bookName: getBookDisplayName(book.slug, locale, book.name),
            bookSlug: book.slug,
            chapter,
            verse,
            text: verseText,
          });

          router.push(`/reader/${book.slug}/${chapter}`);
        }
      } catch (err) {
        console.warn("Failed to parse linked verse:", err);
      }
    },
    [locale, router, setSelectedVerse]
  );

  const handleDeleteBookmark = useCallback((item: any) => {
    Alert.alert(
      t("workspace.deleteBookmarkTitle"),
      t("workspace.deleteBookmarkMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            await toggleBookmark(item.verse_id, item.book_id, item.chapter, item.verse);
          },
        },
      ]
    );
  }, [toggleBookmark, t]);

  // Markdown Reference Parser for preview
  const renderPreviewContent = () => {
    if (!body.trim()) {
      return (
        <Text style={styles.previewPlaceholder}>{t("workspace.previewPlaceholder")}</Text>
      );
    }

    const regex = /\b(rdz|ps|j|rz)\s*(\d+)[:,\s]+(\d+)\b/gi;
    const parts = [];
    let lastIndex = 0;
    let match;

    const mapping: Record<string, string> = {
      rdz: "genesis",
      ps: "psalms",
      j: "john",
      rz: "romans",
    };

    while ((match = regex.exec(body)) !== null) {
      const matchIndex = match.index;
      const matchText = match[0];
      const abbr = match[1].toLowerCase();
      const chapter = parseInt(match[2], 10);
      const verse = parseInt(match[3], 10);
      const bookSlug = mapping[abbr];

      if (matchIndex > lastIndex) {
        parts.push(
          <Text key={`text-${lastIndex}`} style={styles.previewText}>
            {body.substring(lastIndex, matchIndex)}
          </Text>
        );
      }

      if (bookSlug) {
        parts.push(
          <Text
            key={`link-${matchIndex}`}
            style={styles.previewLink}
            onPress={() => void handleLinkPress(bookSlug, chapter, verse)}
          >
            {matchText}
          </Text>
        );
      } else {
        parts.push(
          <Text key={`match-${matchIndex}`} style={styles.previewText}>
            {matchText}
          </Text>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < body.length) {
      parts.push(
        <Text key={`text-end-${lastIndex}`} style={styles.previewText}>
          {body.substring(lastIndex)}
        </Text>
      );
    }

    return <Text style={styles.previewParagraph}>{parts}</Text>;
  };

  // Filter notes
  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isEditing = editingNoteId !== null || title || body;

  // Render Note Editor View
  if (isEditing) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        {/* Editor Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
          <Pressable onPress={() => void handleBackToList()} style={styles.backButton} hitSlop={15}>
            <Ionicons name="arrow-back" size={24} color={colors.accent} />
            <Text style={styles.backButtonText}>{t("workspace.notesBack")}</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {editingNoteId ? t("workspace.editNote") : t("workspace.newNote")}
          </Text>
          <View style={styles.headerRight}>
            <Pressable onPress={() => void handleSave()} style={styles.saveIcon} hitSlop={15}>
              <Ionicons name="save-outline" size={22} color={colors.accent} />
            </Pressable>
            <Pressable
              onPress={() => void handleShareNote()}
              style={styles.shareIcon}
              hitSlop={15}
              accessibilityLabel={t("workspace.shareNoteTitle")}
            >
              <Ionicons name="share-outline" size={22} color={colors.accent} />
            </Pressable>
            {editingNoteId && (
              <Pressable onPress={handleDelete} style={styles.deleteIcon} hitSlop={15}>
                <Ionicons name="trash-outline" size={22} color={colors.danger} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Edit / Preview Tabs */}
        <View style={styles.subTabsContainer}>
          <Pressable
            onPress={() => setActiveSubTab("edit")}
            style={[styles.subTab, activeSubTab === "edit" && styles.subTabActive]}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color={activeSubTab === "edit" ? colors.accent : colors.textSecondary}
            />
            <Text
              style={[styles.subTabLabel, activeSubTab === "edit" && styles.subTabLabelActive]}
            >
              {t("workspace.editTab")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveSubTab("preview")}
            style={[styles.subTab, activeSubTab === "preview" && styles.subTabActive]}
          >
            <Ionicons
              name="eye-outline"
              size={16}
              color={activeSubTab === "preview" ? colors.accent : colors.textSecondary}
            />
            <Text
              style={[styles.subTabLabel, activeSubTab === "preview" && styles.subTabLabelActive]}
            >
              {t("workspace.previewTab")}
            </Text>
          </Pressable>
        </View>

        {activeSubTab === "edit" ? (
          <ScrollView contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled">
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t("workspace.titlePlaceholder")}
              placeholderTextColor={colors.textMuted}
              style={styles.titleInput}
              maxLength={100}
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={t("workspace.bodyPlaceholder")}
              placeholderTextColor={colors.textMuted}
              style={styles.bodyInput}
              multiline
              textAlignVertical="top"
              maxLength={5000}
            />
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.previewContent}>
            <Text style={styles.previewTitle}>{title || t("common.untitled")}</Text>
            {renderPreviewContent()}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    );
  }

  // --- Main Workspace Lists (Notes & Bookmarks) ---
  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <Text style={styles.headerTitleMain}>{t("workspace.title")}</Text>
        {workspaceTab === "notes" && (
          <Pressable onPress={handleCreateNewNote} style={styles.createNewButton} hitSlop={15}>
            <Ionicons name="add" size={24} color={colors.canvas} />
          </Pressable>
        )}
      </View>

      {/* Main Mode Toggles (Rozważania / Zakładki) */}
      <View style={styles.mainToggles}>
        <Pressable
          onPress={() => setWorkspaceTab("notes")}
          style={[styles.toggleBtn, workspaceTab === "notes" && styles.toggleBtnActive]}
        >
          <Text style={[styles.toggleBtnText, workspaceTab === "notes" && styles.toggleBtnTextActive]}>
            {t("workspace.notesCount", { count: notes.length })}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setWorkspaceTab("bookmarks")}
          style={[styles.toggleBtn, workspaceTab === "bookmarks" && styles.toggleBtnActive]}
        >
          <Text style={[styles.toggleBtnText, workspaceTab === "bookmarks" && styles.toggleBtnTextActive]}>
            {t("workspace.bookmarksCount", { count: bookmarks.length })}
          </Text>
        </Pressable>
      </View>

      {workspaceTab === "notes" ? (
        // --- Rozważania (Notes List) ---
        <>
          <View style={styles.searchBarContainer}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t("workspace.filterNotes")}
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} style={styles.searchClear} hitSlop={10}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {isNotesLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : filteredNotes.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="journal-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>{t("workspace.noNotes")}</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? t("workspace.noNotesSearch") : t("workspace.noNotesEmpty")}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredNotes}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => (
                <Pressable onPress={() => handleEditNote(item)}>
                  <GlassCard style={styles.noteCard}>
                    <View style={styles.noteCardHeader}>
                      <Text style={styles.noteCardTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.noteCardDate}>
                        {formatNoteDate(item.updatedAt, locale)}
                      </Text>
                    </View>
                    <Text style={styles.noteCardBody} numberOfLines={3}>
                      {item.body || t("common.noContent")}
                    </Text>
                  </GlassCard>
                </Pressable>
              )}
            />
          )}
        </>
      ) : (
        // --- Zakładki (Saved Bookmarks List) ---
        <>
          {isBookmarksLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : bookmarks.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="bookmark-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>{t("workspace.noBookmarks")}</Text>
              <Text style={styles.emptySubtitle}>{t("workspace.noBookmarksEmpty")}</Text>
            </View>
          ) : (
            <FlatList
              data={bookmarks}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => (
                <GlassCard style={styles.bookmarkCard}>
                  <View style={styles.bookmarkCardHeader}>
                    <Pressable
                      style={styles.bookmarkRefContainer}
                      onPress={() =>
                        void handleLinkPress(item.book_slug ?? "", item.chapter, item.verse)
                      }
                    >
                      <Ionicons name="book" size={16} color={colors.accent} style={{ marginRight: 6 }} />
                      <Text style={styles.bookmarkCardRef}>
                        {formatBookReference(
                          item.book_slug,
                          item.chapter,
                          item.verse,
                          locale,
                          item.book_name ?? t("common.book")
                        )}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteBookmark(item)}
                      style={styles.bookmarkDeleteBtn}
                      hitSlop={10}
                    >
                      <Ionicons name="trash" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                  <Text style={styles.bookmarkCardText} numberOfLines={4}>
                    {item.verse_text ?? t("common.textUnavailable")}
                  </Text>
                  <Text style={styles.bookmarkCardDate}>
                    {t("workspace.savedAt", { date: formatSavedDate(item.created_at, locale) })}
                  </Text>
                </GlassCard>
              )}
            />
          )}
        </>
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
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
  },
  headerTitleMain: {
    ...typography.subtitle,
    color: colors.accent,
    fontWeight: "700",
  },
  headerTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    flex: 1,
    textAlign: "center",
    marginHorizontal: spacing.sm,
  },
  createNewButton: {
    backgroundColor: colors.accent,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 70,
  },
  backButtonText: {
    ...typography.caption,
    color: colors.accent,
    marginLeft: spacing.xs,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 70,
    gap: spacing.md,
  },
  saveIcon: {
    padding: spacing.xs,
  },
  shareIcon: {
    padding: spacing.xs,
  },
  deleteIcon: {
    padding: spacing.xs,
  },
  mainToggles: {
    flexDirection: "row",
    padding: spacing.sm,
    backgroundColor: colors.canvas,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radii.md,
    backgroundColor: "transparent",
  },
  toggleBtnActive: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  toggleBtnText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  toggleBtnTextActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    height: 40,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.body,
  },
  searchClear: {
    padding: spacing.xs,
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.sm,
  },
  noteCard: {
    padding: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  noteCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  noteCardTitle: {
    ...typography.subtitle,
    color: colors.accent,
    fontWeight: "600",
    flex: 1,
    marginRight: spacing.sm,
  },
  noteCardDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  noteCardBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
  bookmarkCard: {
    padding: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  bookmarkCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  bookmarkRefContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  bookmarkCardRef: {
    ...typography.subtitle,
    color: colors.accent,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  bookmarkDeleteBtn: {
    padding: spacing.xs,
  },
  bookmarkCardText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  bookmarkCardDate: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "right",
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginTop: spacing.md,
    fontWeight: "600",
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  subTabsContainer: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
  },
  subTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  subTabActive: {
    borderBottomColor: colors.accent,
  },
  subTabLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  subTabLabelActive: {
    color: colors.accent,
    fontWeight: "600",
  },
  editorContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  titleInput: {
    ...typography.subtitle,
    color: colors.textPrimary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
    fontWeight: "600",
  },
  bodyInput: {
    flex: 1,
    color: colors.textSecondary,
    ...typography.body,
    minHeight: 300,
    lineHeight: 22,
  },
  previewContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  previewTitle: {
    ...typography.subtitle,
    color: colors.accent,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  previewParagraph: {
    lineHeight: 24,
  },
  previewText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  previewLink: {
    ...typography.body,
    color: colors.accent,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  previewPlaceholder: {
    ...typography.body,
    color: colors.textMuted,
    fontStyle: "italic",
  },
});

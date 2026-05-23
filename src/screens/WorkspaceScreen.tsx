import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotesStore, Note } from "@/store/notesStore";
import { useBookmarksStore } from "@/store/bookmarksStore";
import { useSelectionStore } from "@/store/selectionStore";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import { colors, radii, spacing, typography } from "@/theme";
import { GlassCard } from "@/components/GlassCard";

export default function WorkspaceScreen() {
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
      setBody(`Rozważanie do wersetu [${abbr} ${selectedVerse.chapter}:${selectedVerse.verse}]:\n\n"${selectedVerse.text}"\n\n`);
    } else {
      setBody("");
    }
    setActiveSubTab("edit");
  }, [selectedVerse]);

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

    const savedTitle = trimmedTitle || "Bez tytułu";
    const savedId = await saveNote(editingNoteId, savedTitle, body);
    setEditingNoteId(savedId);
    Alert.alert("Sukces", "Notatka została pomyślnie zapisana.");
  }, [body, editingNoteId, saveNote, title]);

  const handleDelete = useCallback(() => {
    if (!editingNoteId) return;

    Alert.alert(
      "Usuń notatkę",
      "Czy na pewno chcesz usunąć tę notatkę?",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
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
  }, [deleteNote, editingNoteId]);

  const handleBackToList = useCallback(async () => {
    if (title.trim() || body.trim()) {
      const trimmedTitle = title.trim() || "Bez tytułu";
      await saveNote(editingNoteId, trimmedTitle, body);
    }
    setEditingNoteId(null);
    setTitle("");
    setBody("");
  }, [body, editingNoteId, saveNote, title]);

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
            bookName: book.name,
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
    [router, setSelectedVerse]
  );

  const handleDeleteBookmark = useCallback((item: any) => {
    Alert.alert(
      "Usuń zakładkę",
      "Czy na pewno chcesz usunąć ten werset z zakładek?",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: async () => {
            await toggleBookmark(item.verse_id, item.book_id, item.chapter, item.verse);
          },
        },
      ]
    );
  }, [toggleBookmark]);

  // Markdown Reference Parser for preview
  const renderPreviewContent = () => {
    if (!body.trim()) {
      return (
        <Text style={styles.previewPlaceholder}>
          Podgląd przemyśleń wygeneruje się w czasie rzeczywistym...
        </Text>
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
            <Text style={styles.backButtonText}>Notatki</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {editingNoteId ? "Edytuj notatkę" : "Nowa notatka"}
          </Text>
          <View style={styles.headerRight}>
            <Pressable onPress={() => void handleSave()} style={styles.saveIcon} hitSlop={15}>
              <Ionicons name="save-outline" size={22} color={colors.accent} />
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
              Edycja
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
              Podgląd (Auto-linki)
            </Text>
          </Pressable>
        </View>

        {activeSubTab === "edit" ? (
          <ScrollView contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled">
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Tytuł rozważania..."
              placeholderTextColor={colors.textMuted}
              style={styles.titleInput}
              maxLength={100}
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Zapisz swoje przemyślenia. Polskie sygnatury wersetów (np. Rdz 1:1, Ps 23:1, J 3,16, Rz 8:28) w trybie podglądu automatycznie zamienią się w interaktywne odnośniki do czytnika biblijnego..."
              placeholderTextColor={colors.textMuted}
              style={styles.bodyInput}
              multiline
              textAlignVertical="top"
              maxLength={5000}
            />
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.previewContent}>
            <Text style={styles.previewTitle}>{title || "Bez tytułu"}</Text>
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
        <Text style={styles.headerTitleMain}>Workspace</Text>
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
            Rozważania ({notes.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setWorkspaceTab("bookmarks")}
          style={[styles.toggleBtn, workspaceTab === "bookmarks" && styles.toggleBtnActive]}
        >
          <Text style={[styles.toggleBtnText, workspaceTab === "bookmarks" && styles.toggleBtnTextActive]}>
            Zakładki ({bookmarks.length})
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
              placeholder="Filtruj notatki..."
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
              <Text style={styles.emptyTitle}>Brak notatek</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? "Brak wyników wyszukiwania." : "Kliknij '+', aby utworzyć pierwsze rozważanie."}
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
                        {new Date(item.updatedAt).toLocaleDateString("pl-PL", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <Text style={styles.noteCardBody} numberOfLines={3}>
                      {item.body || "Brak treści."}
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
              <Text style={styles.emptyTitle}>Brak zakładek</Text>
              <Text style={styles.emptySubtitle}>
                Oznaczaj wersety gwiazdką w czytniku, aby zapisać je w tym miejscu.
              </Text>
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
                        {item.book_name ?? "Księga"} {item.chapter}:{item.verse}
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
                    {item.verse_text ?? "Tekst niedostępny."}
                  </Text>
                  <Text style={styles.bookmarkCardDate}>
                    Zapisano: {new Date(item.created_at).toLocaleDateString("pl-PL")}
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

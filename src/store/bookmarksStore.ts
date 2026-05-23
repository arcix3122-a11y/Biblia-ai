import { create } from "zustand";
import type { Bookmark } from "@/types/scripture";
import * as bookmarksRepo from "@/services/db/bookmarksRepository";

interface BookmarksState {
  bookmarks: Bookmark[];
  bookmarkedVerseIds: Set<number>;
  isLoading: boolean;
  loadBookmarks: () => Promise<void>;
  toggleBookmark: (
    verseId: number,
    bookId: number,
    chapter: number,
    verse: number
  ) => Promise<void>;
  isBookmarked: (verseId: number) => boolean;
}

export const useBookmarksStore = create<BookmarksState>((set, get) => ({
  bookmarks: [],
  bookmarkedVerseIds: new Set(),
  isLoading: false,

  loadBookmarks: async () => {
    set({ isLoading: true });
    try {
      const bookmarks = await bookmarksRepo.listBookmarks();
      set({
        bookmarks,
        bookmarkedVerseIds: new Set(bookmarks.map((b) => b.verse_id)),
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  toggleBookmark: async (verseId, bookId, chapter, verse) => {
    const existing = await bookmarksRepo.findBookmarkByVerseId(verseId);
    if (existing) {
      await bookmarksRepo.removeBookmark(existing.id);
    } else {
      await bookmarksRepo.addBookmark(verseId, bookId, chapter, verse);
    }
    await get().loadBookmarks();
  },

  isBookmarked: (verseId) => get().bookmarkedVerseIds.has(verseId),
}));

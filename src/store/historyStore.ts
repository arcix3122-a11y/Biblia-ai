import { create } from "zustand";
import type { ReadingHistoryEntry } from "@/types/scripture";
import * as historyRepo from "@/services/db/historyRepository";

interface HistoryState {
  recent: ReadingHistoryEntry[];
  lastRead: ReadingHistoryEntry | null;
  isLoading: boolean;
  loadHistory: () => Promise<void>;
  recordPosition: (bookId: number, chapter: number, verse: number) => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  recent: [],
  lastRead: null,
  isLoading: false,

  loadHistory: async () => {
    set({ isLoading: true });
    try {
      const [recent, lastRead] = await Promise.all([
        historyRepo.getRecentHistory(),
        historyRepo.getLastReadPosition(),
      ]);
      set({ recent, lastRead, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  recordPosition: async (bookId, chapter, verse) => {
    await historyRepo.recordReading(bookId, chapter, verse);
    const [recent, lastRead] = await Promise.all([
      historyRepo.getRecentHistory(),
      historyRepo.getLastReadPosition(),
    ]);
    set({ recent, lastRead });
  },
}));

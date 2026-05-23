import { create } from "zustand";
import type { HighlightColor } from "@/types/scripture";
import * as highlightsRepo from "@/services/db/highlightsRepository";

interface HighlightsState {
  highlightColors: Map<number, HighlightColor>;
  isLoading: boolean;
  loadHighlights: () => Promise<void>;
  setHighlight: (verseId: number, color: HighlightColor) => Promise<void>;
  clearHighlight: (verseId: number) => Promise<void>;
  getHighlightColor: (verseId: number) => HighlightColor | undefined;
}

export const useHighlightsStore = create<HighlightsState>((set, get) => ({
  highlightColors: new Map(),
  isLoading: false,

  loadHighlights: async () => {
    set({ isLoading: true });
    try {
      const highlights = await highlightsRepo.listHighlights();
      set({
        highlightColors: new Map(highlights.map((h) => [h.verse_id, h.color])),
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  setHighlight: async (verseId, color) => {
    await highlightsRepo.setVerseHighlight(verseId, color);
    const next = new Map(get().highlightColors);
    next.set(verseId, color);
    set({ highlightColors: next });
  },

  clearHighlight: async (verseId) => {
    await highlightsRepo.removeVerseHighlight(verseId);
    const next = new Map(get().highlightColors);
    next.delete(verseId);
    set({ highlightColors: next });
  },

  getHighlightColor: (verseId) => get().highlightColors.get(verseId),
}));

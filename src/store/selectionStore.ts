import { create } from "zustand";

export interface SelectedVerse {
  bookId: number;
  bookName: string;
  bookSlug: string;
  chapter: number;
  verse: number;
  text: string;
}

interface SelectionState {
  selectedVerse: SelectedVerse | null;
  setSelectedVerse: (verse: SelectedVerse | null) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedVerse: null,
  setSelectedVerse: (verse) => set({ selectedVerse: verse }),
  clearSelection: () => set({ selectedVerse: null }),
}));

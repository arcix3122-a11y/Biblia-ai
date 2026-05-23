import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { READING_FONT_SIZES } from "@/theme/typography";

const MIN_FONT = READING_FONT_SIZES[0];
const MAX_FONT = READING_FONT_SIZES[READING_FONT_SIZES.length - 1];

interface ReaderState {
  fontSize: number;
  immersiveMode: boolean;
  setFontSize: (size: number) => void;
  increaseFont: () => void;
  decreaseFont: () => void;
  toggleImmersiveMode: () => void;
  setImmersiveMode: (value: boolean) => void;
}

function stepFont(current: number, direction: 1 | -1): number {
  const index = READING_FONT_SIZES.findIndex((s) => s === current);
  const resolvedIndex = index >= 0 ? index : READING_FONT_SIZES.findIndex((s) => s >= current);
  const nextIndex = Math.min(
    READING_FONT_SIZES.length - 1,
    Math.max(0, (resolvedIndex >= 0 ? resolvedIndex : 2) + direction)
  );
  return READING_FONT_SIZES[nextIndex] ?? current;
}

export const useReaderStore = create<ReaderState>()(
  persist(
    (set, get) => ({
      fontSize: 18,
      immersiveMode: false,
      setFontSize: (size) =>
        set({ fontSize: Math.min(MAX_FONT, Math.max(MIN_FONT, size)) }),
      increaseFont: () => set({ fontSize: stepFont(get().fontSize, 1) }),
      decreaseFont: () => set({ fontSize: stepFont(get().fontSize, -1) }),
      toggleImmersiveMode: () => set({ immersiveMode: !get().immersiveMode }),
      setImmersiveMode: (value) => set({ immersiveMode: value }),
    }),
    {
      name: "@biblia-ai/reader",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ fontSize: state.fontSize }),
    }
  )
);

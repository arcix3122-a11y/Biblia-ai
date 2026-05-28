import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { todayIsoDate } from "@/data/dailyPractice";

interface DailyEngagementState {
  lastPracticeCompletedDate: string | null;
  lastReflectionCompletedDate: string | null;
  markPracticeComplete: () => void;
  markReflectionComplete: () => void;
  isPracticeCompleteToday: () => boolean;
  isReflectionCompleteToday: () => boolean;
}

export const useDailyEngagementStore = create<DailyEngagementState>()(
  persist(
    (set, get) => ({
      lastPracticeCompletedDate: null,
      lastReflectionCompletedDate: null,
      markPracticeComplete: () => set({ lastPracticeCompletedDate: todayIsoDate() }),
      markReflectionComplete: () => set({ lastReflectionCompletedDate: todayIsoDate() }),
      isPracticeCompleteToday: () => get().lastPracticeCompletedDate === todayIsoDate(),
      isReflectionCompleteToday: () => get().lastReflectionCompletedDate === todayIsoDate(),
    }),
    {
      name: "@biblia-ai/daily-engagement",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        lastPracticeCompletedDate: state.lastPracticeCompletedDate,
        lastReflectionCompletedDate: state.lastReflectionCompletedDate,
      }),
    }
  )
);

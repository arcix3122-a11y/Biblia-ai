import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { todayIsoDate } from "@/data/dailyPractice";

export type DailyRhythmStep = "votd" | "reflection" | "prayer" | "journal";

interface DailyRhythmState {
  completedDate: string | null;
  stepsToday: Record<DailyRhythmStep, boolean>;
  markStep: (step: DailyRhythmStep) => void;
  resetIfNewDay: () => void;
  isCompleteToday: () => boolean;
  completedStepCount: () => number;
}

function emptySteps(): Record<DailyRhythmStep, boolean> {
  return { votd: false, reflection: false, prayer: false, journal: false };
}

export const useDailyRhythmStore = create<DailyRhythmState>()(
  persist(
    (set, get) => ({
      completedDate: null,
      stepsToday: emptySteps(),

      resetIfNewDay: () => {
        const today = todayIsoDate();
        const { completedDate, stepsToday } = get();
        const anyStep = Object.values(stepsToday).some(Boolean);
        if (completedDate !== today && anyStep) {
          set({ stepsToday: emptySteps(), completedDate: null });
        }
      },

      markStep: (step) => {
        if (get().stepsToday[step]) return;
        const today = todayIsoDate();
        const nextSteps = { ...get().stepsToday, [step]: true };
        const allDone = Object.values(nextSteps).every(Boolean);
        set({
          stepsToday: nextSteps,
          completedDate: allDone ? today : get().completedDate,
        });

        void import("@/services/stats/userStats").then(({ recordActivity }) => {
          if (step === "votd") void recordActivity("scripture");
          else if (step === "reflection") void recordActivity("reflection");
          else if (step === "prayer") void recordActivity("prayer");
          else if (step === "journal") void recordActivity("practice");
        });

        if (step === "reflection") {
          void import("@/store/dailyEngagementStore").then(({ useDailyEngagementStore }) => {
            useDailyEngagementStore.getState().markReflectionComplete();
          });
        }
        if (step === "prayer") {
          void import("@/store/dailyEngagementStore").then(({ useDailyEngagementStore }) => {
            useDailyEngagementStore.getState().markPracticeComplete();
          });
        }
      },

      isCompleteToday: () => get().completedDate === todayIsoDate(),

      completedStepCount: () =>
        Object.values(get().stepsToday).filter(Boolean).length,
    }),
    {
      name: "@biblia-ai/daily-rhythm",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        completedDate: state.completedDate,
        stepsToday: state.stepsToday,
      }),
    }
  )
);

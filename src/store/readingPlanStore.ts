import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { FOUNDATION_WEEK_PLAN } from "@/data/readingPlans";

const STORAGE_KEY = "@biblia-ai/reading-plan";

interface ReadingPlanProgress {
  planId: string;
  completedDays: number[];
}

interface ReadingPlanState {
  completedDays: number[];
  isLoading: boolean;
  loadProgress: () => Promise<void>;
  markDayComplete: (day: number) => Promise<void>;
  isDayComplete: (day: number) => boolean;
  resetProgress: () => Promise<void>;
}

async function readProgress(): Promise<ReadingPlanProgress> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { planId: FOUNDATION_WEEK_PLAN.id, completedDays: [] };
  }
  try {
    const parsed = JSON.parse(raw) as ReadingPlanProgress;
    if (parsed.planId !== FOUNDATION_WEEK_PLAN.id) {
      return { planId: FOUNDATION_WEEK_PLAN.id, completedDays: [] };
    }
    return {
      planId: parsed.planId,
      completedDays: parsed.completedDays ?? [],
    };
  } catch {
    return { planId: FOUNDATION_WEEK_PLAN.id, completedDays: [] };
  }
}

export const useReadingPlanStore = create<ReadingPlanState>((set, get) => ({
  completedDays: [],
  isLoading: false,

  loadProgress: async () => {
    set({ isLoading: true });
    try {
      const progress = await readProgress();
      set({ completedDays: progress.completedDays, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  markDayComplete: async (day) => {
    const { completedDays } = get();
    if (completedDays.includes(day)) {
      return;
    }
    const next = [...completedDays, day].sort((a, b) => a - b);
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ planId: FOUNDATION_WEEK_PLAN.id, completedDays: next })
    );
    set({ completedDays: next });
  },

  isDayComplete: (day) => get().completedDays.includes(day),

  resetProgress: async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ planId: FOUNDATION_WEEK_PLAN.id, completedDays: [] })
    );
    set({ completedDays: [] });
  },
}));

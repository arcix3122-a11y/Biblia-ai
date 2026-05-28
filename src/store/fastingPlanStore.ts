import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FASTING_TOTAL_DAYS } from "@/data/fastingPlan";
import { scheduleSync } from "@/services/sync/syncEngine";

interface FastingPlanState {
  startDate: string | null;
  completedDays: number[];
  loaded: boolean;
  startPlan: () => Promise<void>;
  resetPlan: () => Promise<void>;
  markDayComplete: (day: number) => Promise<void>;
  isDayComplete: (day: number) => boolean;
  getCurrentDay: () => number;
  getProgress: () => number;
  load: () => Promise<void>;
}

const KEY = "@biblia-ai/fasting-plan";

export const useFastingPlanStore = create<FastingPlanState>((set, get) => ({
  startDate: null,
  completedDays: [],
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { startDate?: string; completedDays?: number[] };
        set({
          startDate: saved.startDate ?? null,
          completedDays: saved.completedDays ?? [],
          loaded: true,
        });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  startPlan: async () => {
    const startDate = new Date().toISOString().split("T")[0]!;
    const state = {
      startDate,
      completedDays: [] as number[],
      updated_at: new Date().toISOString(),
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
    set({ startDate: state.startDate, completedDays: state.completedDays, loaded: true });
    scheduleSync();
  },

  resetPlan: async () => {
    await AsyncStorage.removeItem(KEY);
    set({ startDate: null, completedDays: [], loaded: true });
    scheduleSync();
  },

  markDayComplete: async (day) => {
    const { completedDays, startDate } = get();
    if (completedDays.includes(day)) {
      return;
    }

    const next = [...completedDays, day];
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ startDate, completedDays: next, updated_at: new Date().toISOString() })
    );
    set({ completedDays: next });
    scheduleSync();
  },

  isDayComplete: (day) => get().completedDays.includes(day),

  getCurrentDay: () => {
    const { startDate } = get();
    if (!startDate) {
      return 1;
    }

    const start = new Date(startDate);
    const today = new Date();
    const diff = Math.floor((today.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.min(FASTING_TOTAL_DAYS, Math.max(1, diff + 1));
  },

  getProgress: () => {
    const { completedDays } = get();
    return Math.round((completedDays.length / FASTING_TOTAL_DAYS) * 100);
  },
}));
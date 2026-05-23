import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scheduleSync } from "@/services/sync/syncEngine";

interface YearPlanState {
  startDate: string | null; // ISO date string YYYY-MM-DD
  completedDays: number[];  // list of completed day numbers (1–365)
  loaded: boolean;
  startPlan: () => Promise<void>;
  resetPlan: () => Promise<void>;
  markDayComplete: (day: number) => Promise<void>;
  isDayComplete: (day: number) => boolean;
  getCurrentDay: () => number;
  getProgress: () => number; // 0–100
  load: () => Promise<void>;
}

const KEY = "@biblia-ai/year-plan";

export const useYearPlanStore = create<YearPlanState>((set, get) => ({
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
    if (completedDays.includes(day)) return;
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
    if (!startDate) return 1;
    const start = new Date(startDate);
    const today = new Date();
    const diff = Math.floor((today.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.min(365, Math.max(1, diff + 1));
  },

  getProgress: () => {
    const { completedDays } = get();
    return Math.round((completedDays.length / 365) * 100);
  },
}));

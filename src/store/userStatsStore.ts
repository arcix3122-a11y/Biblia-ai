import { create } from "zustand";
import {
  getUserStats,
  type UserStats,
  recordActivity as recordActivityService,
  recordChapterRead as recordChapterReadService,
  setDailyGoal as setDailyGoalService,
} from "@/services/stats/userStats";

interface UserStatsState {
  stats: UserStats | null;
  loading: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  recordActivity: (type: Parameters<typeof recordActivityService>[0]) => Promise<void>;
  recordChapterRead: (bookSlug: string, chapter: number) => Promise<void>;
  setDailyGoal: (goal: number) => Promise<void>;
}

export const useUserStatsStore = create<UserStatsState>((set, get) => ({
  stats: null,
  loading: false,
  loaded: false,
  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const stats = await getUserStats();
      set({ stats, loaded: true });
    } catch (err) {
      console.warn("Failed to load user stats in store:", err);
    } finally {
      set({ loading: false });
    }
  },
  recordActivity: async (type) => {
    try {
      const stats = await recordActivityService(type);
      set({ stats });
    } catch (err) {
      console.warn("Failed to record activity in store:", err);
    }
  },
  recordChapterRead: async (bookSlug, chapter) => {
    try {
      const stats = await recordChapterReadService(bookSlug, chapter);
      set({ stats });
    } catch (err) {
      console.warn("Failed to record chapter read in store:", err);
    }
  },
  setDailyGoal: async (goal) => {
    try {
      const stats = await setDailyGoalService(goal);
      set({ stats });
    } catch (err) {
      console.warn("Failed to set daily goal in store:", err);
    }
  },
}));

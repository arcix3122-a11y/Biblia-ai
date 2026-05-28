import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import type { PracticeId } from "@/data/practices";
import { useFastingPlanStore } from "@/store/fastingPlanStore";
import { useRosaryStore } from "@/store/rosaryStore";
import { useStationsStore } from "@/store/stationsStore";

const KEY = "@biblia-ai/practices";

interface PracticesPersisted {
  activePracticeId?: PracticeId | null;
  lastSeenAt?: Partial<Record<PracticeId, string>>;
  streakCount?: number;
  lastStreakDate?: string | null;
  practiceReminderEnabled?: boolean;
}

interface PracticesState extends PracticesPersisted {
  loaded: boolean;
  load: () => Promise<void>;
  setActivePractice: (id: PracticeId) => Promise<void>;
  touchPractice: (id: PracticeId) => Promise<void>;
  recordStepCompleted: (id: PracticeId) => Promise<void>;
  setPracticeReminderEnabled: (enabled: boolean) => Promise<void>;
  getProgressPercent: (id: PracticeId) => number;
  isPracticeStarted: (id: PracticeId) => boolean;
}

function todayKey(): string {
  return new Date().toISOString().split("T")[0]!;
}

function yesterdayKey(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0]!;
}

async function persistMeta(state: PracticesPersisted): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...state, updated_at: new Date().toISOString() }));
}

export const usePracticesStore = create<PracticesState>((set, get) => ({
  activePracticeId: null,
  lastSeenAt: {},
  streakCount: 0,
  lastStreakDate: null,
  practiceReminderEnabled: false,
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as PracticesPersisted;
        set({
          activePracticeId: saved.activePracticeId ?? null,
          lastSeenAt: saved.lastSeenAt ?? {},
          streakCount: saved.streakCount ?? 0,
          lastStreakDate: saved.lastStreakDate ?? null,
          practiceReminderEnabled: saved.practiceReminderEnabled ?? false,
          loaded: true,
        });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  setActivePractice: async (id) => {
    const next = { ...get(), activePracticeId: id };
    set({ activePracticeId: id });
    await persistMeta(next);
    await get().touchPractice(id);
  },

  touchPractice: async (id) => {
    const lastSeenAt = { ...get().lastSeenAt, [id]: new Date().toISOString() };
    set({ lastSeenAt });
    await persistMeta({ ...get(), lastSeenAt });
  },

  recordStepCompleted: async (id) => {
    const today = todayKey();
    const { lastStreakDate, streakCount = 0 } = get();
    let nextStreak = streakCount;

    if (lastStreakDate !== today) {
      if (lastStreakDate === yesterdayKey()) {
        nextStreak = streakCount + 1;
      } else {
        nextStreak = 1;
      }
    }

    const next = {
      ...get(),
      activePracticeId: id,
      streakCount: nextStreak,
      lastStreakDate: today,
    };
    set({ streakCount: nextStreak, lastStreakDate: today, activePracticeId: id });
    await persistMeta(next);
    await get().touchPractice(id);
  },

  setPracticeReminderEnabled: async (enabled) => {
    set({ practiceReminderEnabled: enabled });
    await persistMeta({ ...get(), practiceReminderEnabled: enabled });
  },

  getProgressPercent: (id) => {
    switch (id) {
      case "fasting":
        return useFastingPlanStore.getState().getProgress();
      case "stations":
        return useStationsStore.getState().getProgress();
      case "rosary":
        return useRosaryStore.getState().getProgress();
      default:
        return 0;
    }
  },

  isPracticeStarted: (id) => {
    switch (id) {
      case "fasting":
        return Boolean(useFastingPlanStore.getState().startDate);
      case "stations":
        return Boolean(useStationsStore.getState().startDate);
      case "rosary":
        return Boolean(useRosaryStore.getState().startDate);
      default:
        return false;
    }
  },
}));

export async function hydratePracticeProgressStores(): Promise<void> {
  await Promise.all([
    useFastingPlanStore.getState().load(),
    useStationsStore.getState().load(),
    useRosaryStore.getState().load(),
    usePracticesStore.getState().load(),
  ]);
}

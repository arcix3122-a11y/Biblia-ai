import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { ROSARY_TOTAL_DECADES, type RosarySetId } from "@/data/rosary";
import { scheduleSync } from "@/services/sync/syncEngine";

interface RosaryState {
  startDate: string | null;
  selectedSetId: RosarySetId;
  currentDecade: number;
  beadCount: number;
  loaded: boolean;
  load: () => Promise<void>;
  startJourney: () => Promise<void>;
  resetJourney: () => Promise<void>;
  selectSet: (setId: RosarySetId) => Promise<void>;
  countBead: () => Promise<void>;
  getProgress: () => number;
  isJourneyComplete: () => boolean;
}

const KEY = "@biblia-ai/rosary";

function persistState(state: Pick<RosaryState, "startDate" | "selectedSetId" | "currentDecade" | "beadCount">) {
  return AsyncStorage.setItem(
    KEY,
    JSON.stringify({ ...state, updated_at: new Date().toISOString() })
  );
}

export const useRosaryStore = create<RosaryState>((set, get) => ({
  startDate: null,
  selectedSetId: "joyful",
  currentDecade: 0,
  beadCount: 0,
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          startDate?: string;
          selectedSetId?: RosarySetId;
          currentDecade?: number;
          beadCount?: number;
        };
        set({
          startDate: saved.startDate ?? null,
          selectedSetId: saved.selectedSetId ?? "joyful",
          currentDecade: saved.currentDecade ?? 0,
          beadCount: saved.beadCount ?? 0,
          loaded: true,
        });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  startJourney: async () => {
    const { selectedSetId } = get();
    const startDate = new Date().toISOString().split("T")[0]!;
    const next = { startDate, selectedSetId, currentDecade: 0, beadCount: 0 };
    await persistState(next);
    set({ ...next, loaded: true });
    scheduleSync();
  },

  resetJourney: async () => {
    await AsyncStorage.removeItem(KEY);
    set({ startDate: null, currentDecade: 0, beadCount: 0, loaded: true });
    scheduleSync();
  },

  selectSet: async (setId) => {
    const next = { ...get(), selectedSetId: setId, currentDecade: 0, beadCount: 0 };
    await persistState(next);
    set({ selectedSetId: setId, currentDecade: 0, beadCount: 0 });
    scheduleSync();
  },

  countBead: async () => {
    const { startDate, selectedSetId, currentDecade, beadCount } = get();
    if (!startDate) {
      return;
    }

    const nextBeadCount = beadCount + 1;
    let nextDecade = currentDecade;
    let nextCount = nextBeadCount;

    if (nextBeadCount >= 10) {
      nextDecade = Math.min(ROSARY_TOTAL_DECADES, currentDecade + 1);
      nextCount = 0;
    }

    await persistState({
      startDate,
      selectedSetId,
      currentDecade: nextDecade,
      beadCount: nextCount,
    });
    set({ currentDecade: nextDecade, beadCount: nextCount });
    scheduleSync();
  },

  getProgress: () => {
    const { currentDecade, beadCount } = get();
    return Math.round(((currentDecade * 10) + beadCount) / (ROSARY_TOTAL_DECADES * 10) * 100);
  },

  isJourneyComplete: () => get().currentDecade >= ROSARY_TOTAL_DECADES,
}));
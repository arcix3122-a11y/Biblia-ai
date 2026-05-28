import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { STATION_TOTAL } from "@/data/stations";
import { scheduleSync } from "@/services/sync/syncEngine";

interface StationsState {
  startDate: string | null;
  completedStations: number[];
  loaded: boolean;
  startJourney: () => Promise<void>;
  resetJourney: () => Promise<void>;
  markStationComplete: (stationNumber: number) => Promise<void>;
  isStationComplete: (stationNumber: number) => boolean;
  getCurrentStation: () => number;
  getProgress: () => number;
  load: () => Promise<void>;
}

const KEY = "@biblia-ai/stations";

export const useStationsStore = create<StationsState>((set, get) => ({
  startDate: null,
  completedStations: [],
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { startDate?: string; completedStations?: number[] };
        set({
          startDate: saved.startDate ?? null,
          completedStations: saved.completedStations ?? [],
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
    const startDate = new Date().toISOString().split("T")[0]!;
    const state = {
      startDate,
      completedStations: [] as number[],
      updated_at: new Date().toISOString(),
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
    set({ startDate: state.startDate, completedStations: state.completedStations, loaded: true });
    scheduleSync();
  },

  resetJourney: async () => {
    await AsyncStorage.removeItem(KEY);
    set({ startDate: null, completedStations: [], loaded: true });
    scheduleSync();
  },

  markStationComplete: async (stationNumber) => {
    const { completedStations, startDate } = get();
    if (completedStations.includes(stationNumber)) {
      return;
    }

    const next = [...completedStations, stationNumber];
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ startDate, completedStations: next, updated_at: new Date().toISOString() })
    );
    set({ completedStations: next });
    scheduleSync();
  },

  isStationComplete: (stationNumber) => get().completedStations.includes(stationNumber),

  getCurrentStation: () => {
    const { startDate, completedStations } = get();
    if (!startDate) {
      return 1;
    }

    return Math.min(STATION_TOTAL, Math.max(1, completedStations.length + 1));
  },

  getProgress: () => {
    const { completedStations } = get();
    return Math.round((completedStations.length / STATION_TOTAL) * 100);
  },
}));
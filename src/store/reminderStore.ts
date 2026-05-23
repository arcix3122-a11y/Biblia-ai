import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ReminderState {
  enabled: boolean;
  hour: number;
  minute: number;
  loaded: boolean;
  setEnabled: (v: boolean) => void;
  setTime: (hour: number, minute: number) => void;
  load: () => Promise<void>;
}

const KEY = "@biblia-ai/reminder";

export const useReminderStore = create<ReminderState>((set, get) => ({
  enabled: false,
  hour: 8,
  minute: 0,
  loaded: false,

  setEnabled: (enabled) => {
    set({ enabled });
    void AsyncStorage.setItem(KEY, JSON.stringify({ ...get(), enabled }));
  },

  setTime: (hour, minute) => {
    set({ hour, minute });
    void AsyncStorage.setItem(KEY, JSON.stringify({ ...get(), hour, minute }));
  },

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { enabled?: boolean; hour?: number; minute?: number };
        set({
          enabled: saved.enabled ?? false,
          hour: saved.hour ?? 8,
          minute: saved.minute ?? 0,
          loaded: true,
        });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },
}));

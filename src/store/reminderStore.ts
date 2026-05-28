import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ReminderPersisted {
  enabled?: boolean;
  hour?: number;
  minute?: number;
  eveningRescueEnabled?: boolean;
  reminderFunnelPromptSeen?: boolean;
}

interface ReminderState {
  enabled: boolean;
  hour: number;
  minute: number;
  eveningRescueEnabled: boolean;
  reminderFunnelPromptSeen: boolean;
  loaded: boolean;
  setEnabled: (v: boolean) => void;
  setTime: (hour: number, minute: number) => void;
  setEveningRescueEnabled: (v: boolean) => void;
  markReminderFunnelPromptSeen: () => void;
  load: () => Promise<void>;
}

const KEY = "@biblia-ai/reminder";

function persistSnapshot(state: ReminderState): void {
  const payload: ReminderPersisted = {
    enabled: state.enabled,
    hour: state.hour,
    minute: state.minute,
    eveningRescueEnabled: state.eveningRescueEnabled,
    reminderFunnelPromptSeen: state.reminderFunnelPromptSeen,
  };
  void AsyncStorage.setItem(KEY, JSON.stringify(payload));
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  enabled: false,
  hour: 8,
  minute: 0,
  eveningRescueEnabled: true,
  reminderFunnelPromptSeen: false,
  loaded: false,

  setEnabled: (enabled) => {
    set({ enabled });
    persistSnapshot(get());
  },

  setTime: (hour, minute) => {
    set({ hour, minute });
    persistSnapshot(get());
  },

  setEveningRescueEnabled: (eveningRescueEnabled) => {
    set({ eveningRescueEnabled });
    persistSnapshot(get());
  },

  markReminderFunnelPromptSeen: () => {
    set({ reminderFunnelPromptSeen: true });
    persistSnapshot(get());
  },

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as ReminderPersisted;
        set({
          enabled: saved.enabled ?? false,
          hour: saved.hour ?? 8,
          minute: saved.minute ?? 0,
          eveningRescueEnabled: saved.eveningRescueEnabled ?? true,
          reminderFunnelPromptSeen: saved.reminderFunnelPromptSeen ?? false,
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

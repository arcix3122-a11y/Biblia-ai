import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const KEY = "@biblia-ai/rating-prompt";
const DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_PROMPT_DELAY_MS = 7 * DAY_MS;
const PROMPT_COOLDOWN_MS = 21 * DAY_MS;
const MIN_ACTIVITY_COUNT = 5;
const MIN_ACTIVITY_BETWEEN_PROMPTS = 5;

interface RatingPromptPersisted {
  firstSeenAt?: number;
  hasRated?: boolean;
  dismissCount?: number;
  lastPromptAt?: number | null;
  lastPromptActivityCount?: number | null;
}

interface RatingPromptState {
  loaded: boolean;
  firstSeenAt: number;
  hasRated: boolean;
  dismissCount: number;
  lastPromptAt: number | null;
  lastPromptActivityCount: number | null;
  load: () => Promise<void>;
  canShowPrompt: (activityCount: number, now?: number) => boolean;
  markPromptShown: (activityCount: number, now?: number) => void;
  markDismissed: () => void;
  markRated: () => void;
}

function persistSnapshot(state: RatingPromptState): void {
  const payload: RatingPromptPersisted = {
    firstSeenAt: state.firstSeenAt,
    hasRated: state.hasRated,
    dismissCount: state.dismissCount,
    lastPromptAt: state.lastPromptAt,
    lastPromptActivityCount: state.lastPromptActivityCount,
  };
  void AsyncStorage.setItem(KEY, JSON.stringify(payload));
}

export const useRatingPromptStore = create<RatingPromptState>((set, get) => ({
  loaded: false,
  firstSeenAt: Date.now(),
  hasRated: false,
  dismissCount: 0,
  lastPromptAt: null,
  lastPromptActivityCount: null,

  load: async () => {
    const now = Date.now();
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) {
        set({ loaded: true, firstSeenAt: now });
        persistSnapshot(get());
        return;
      }
      const saved = JSON.parse(raw) as RatingPromptPersisted;
      set({
        loaded: true,
        firstSeenAt: saved.firstSeenAt ?? now,
        hasRated: saved.hasRated ?? false,
        dismissCount: saved.dismissCount ?? 0,
        lastPromptAt: saved.lastPromptAt ?? null,
        lastPromptActivityCount: saved.lastPromptActivityCount ?? null,
      });
    } catch {
      set({ loaded: true, firstSeenAt: now });
    }
  },

  canShowPrompt: (activityCount, now = Date.now()) => {
    const state = get();
    if (!state.loaded || state.hasRated) {
      return false;
    }
    if (activityCount < MIN_ACTIVITY_COUNT) {
      return false;
    }
    if (now - state.firstSeenAt < FIRST_PROMPT_DELAY_MS) {
      return false;
    }
    if (state.lastPromptAt && now - state.lastPromptAt < PROMPT_COOLDOWN_MS) {
      return false;
    }
    if (
      state.lastPromptActivityCount !== null &&
      activityCount - state.lastPromptActivityCount < MIN_ACTIVITY_BETWEEN_PROMPTS
    ) {
      return false;
    }
    return true;
  },

  markPromptShown: (activityCount, now = Date.now()) => {
    set({
      lastPromptAt: now,
      lastPromptActivityCount: activityCount,
    });
    persistSnapshot(get());
  },

  markDismissed: () => {
    set((state) => ({ dismissCount: state.dismissCount + 1 }));
    persistSnapshot(get());
  },

  markRated: () => {
    set({ hasRated: true });
    persistSnapshot(get());
  },
}));

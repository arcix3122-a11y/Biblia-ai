import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

interface VerseReviewRecord {
  reviewedAt: string;
  dueAt: string;
  intervalDays: number;
  rememberedCount: number;
}

interface VerseReviewState {
  records: Record<string, VerseReviewRecord>;
  loaded: boolean;
  load: () => Promise<void>;
  markRemembered: (key: string) => Promise<void>;
  markReviewLater: (key: string) => Promise<void>;
  isDue: (key: string) => boolean;
}

const KEY = "@biblia-ai/verse-review";

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

async function persist(records: Record<string, VerseReviewRecord>): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify({ records }));
}

export const useVerseReviewStore = create<VerseReviewState>((set, get) => ({
  records: {},
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) {
        set({ loaded: true });
        return;
      }
      const parsed = JSON.parse(raw) as { records?: Record<string, VerseReviewRecord> };
      set({ records: parsed.records ?? {}, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  markRemembered: async (key) => {
    const previous = get().records[key];
    const intervalDays = Math.min(30, Math.max(1, (previous?.intervalDays ?? 0) * 2 || 1));
    const next = {
      ...get().records,
      [key]: {
        reviewedAt: new Date().toISOString(),
        dueAt: addDays(intervalDays),
        intervalDays,
        rememberedCount: (previous?.rememberedCount ?? 0) + 1,
      },
    };
    await persist(next);
    set({ records: next });
  },

  markReviewLater: async (key) => {
    const previous = get().records[key];
    const next = {
      ...get().records,
      [key]: {
        reviewedAt: new Date().toISOString(),
        dueAt: addDays(1),
        intervalDays: 1,
        rememberedCount: previous?.rememberedCount ?? 0,
      },
    };
    await persist(next);
    set({ records: next });
  },

  isDue: (key) => {
    const record = get().records[key];
    if (!record) {
      return true;
    }
    return new Date(record.dueAt).getTime() <= Date.now();
  },
}));

import { create } from "zustand";

export type SeedPhase = "idle" | "preparing" | "books" | "verses" | "done" | "error";

interface SeedProgressState {
  active: boolean;
  phase: SeedPhase;
  percent: number;
  messageKey: string | null;
  error: string | null;
  setProgress: (update: Partial<Omit<SeedProgressState, "setProgress" | "reset">>) => void;
  reset: () => void;
}

const initialState = {
  active: false,
  phase: "idle" as SeedPhase,
  percent: 0,
  messageKey: null,
  error: null,
};

export const useSeedProgressStore = create<SeedProgressState>((set) => ({
  ...initialState,
  setProgress: (update) => set((state) => ({ ...state, ...update })),
  reset: () => set(initialState),
}));

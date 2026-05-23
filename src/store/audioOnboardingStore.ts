import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AudioOnboardingState {
  hasCompleted: boolean;
  complete: () => void;
}

export const useAudioOnboardingStore = create<AudioOnboardingState>()(
  persist(
    (set) => ({
      hasCompleted: false,
      complete: () => set({ hasCompleted: true }),
    }),
    {
      name: "@biblia-ai/audio-onboarding-complete",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ hasCompleted: state.hasCompleted }),
    }
  )
);

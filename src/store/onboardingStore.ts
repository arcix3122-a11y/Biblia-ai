import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface OnboardingState {
  hasSeenLanguageTip: boolean;
  dismissLanguageTip: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenLanguageTip: false,
      dismissLanguageTip: () => set({ hasSeenLanguageTip: true }),
    }),
    {
      name: "@biblia-ai/onboarding",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ hasSeenLanguageTip: state.hasSeenLanguageTip }),
    }
  )
);

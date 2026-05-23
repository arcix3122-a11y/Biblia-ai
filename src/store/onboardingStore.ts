import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface OnboardingState {
  hasSeenLanguageTip: boolean;
  hasSeenEcosystemModal: boolean;
  dismissLanguageTip: () => void;
  dismissEcosystemModal: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenLanguageTip: false,
      hasSeenEcosystemModal: false,
      dismissLanguageTip: () => set({ hasSeenLanguageTip: true }),
      dismissEcosystemModal: () => set({ hasSeenEcosystemModal: true }),
    }),
    {
      name: "@biblia-ai/onboarding",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasSeenLanguageTip: state.hasSeenLanguageTip,
        hasSeenEcosystemModal: state.hasSeenEcosystemModal,
      }),
    }
  )
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface OnboardingState {
  hasSeenLanguageTip: boolean;
  hasSeenEcosystemModal: boolean;
  hasDismissedKjvBanner: boolean;
  dismissLanguageTip: () => void;
  dismissEcosystemModal: () => void;
  dismissKjvBanner: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenLanguageTip: false,
      hasSeenEcosystemModal: false,
      hasDismissedKjvBanner: false,
      dismissLanguageTip: () => set({ hasSeenLanguageTip: true }),
      dismissEcosystemModal: () => set({ hasSeenEcosystemModal: true }),
      dismissKjvBanner: () => set({ hasDismissedKjvBanner: true }),
    }),
    {
      name: "@biblia-ai/onboarding",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasSeenLanguageTip: state.hasSeenLanguageTip,
        hasSeenEcosystemModal: state.hasSeenEcosystemModal,
        hasDismissedKjvBanner: state.hasDismissedKjvBanner,
      }),
    }
  )
);

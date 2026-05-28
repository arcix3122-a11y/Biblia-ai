import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  getTierByAmount,
  resolveHighestTier,
  type DonorTierId,
} from "@/data/donationTiers";
import { recordDonationRemote } from "@/services/donation/donationRepository";

interface DonorState {
  donorTier: DonorTierId | null;
  totalDonatedPln: number;
  lastDonationAt: string | null;
  hydrated: boolean;
  recordDonation: (amountPln: number) => Promise<DonorTierId | null>;
}

export const useDonorStore = create<DonorState>()(
  persist(
    (set, get) => ({
      donorTier: null,
      totalDonatedPln: 0,
      lastDonationAt: null,
      hydrated: false,

      recordDonation: async (amountPln) => {
        const tier = getTierByAmount(amountPln);
        if (!tier) {
          return null;
        }

        const now = new Date().toISOString();
        const nextTier = resolveHighestTier(get().donorTier, tier.id);

        set({
          donorTier: nextTier,
          totalDonatedPln: get().totalDonatedPln + amountPln,
          lastDonationAt: now,
        });

        void recordDonationRemote({
          amountPln,
          tier: tier.id,
          createdAt: now,
        });

        return nextTier;
      },
    }),
    {
      name: "@biblia-ai/donor",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        useDonorStore.setState({ hydrated: true });
      },
      partialize: (state) => ({
        donorTier: state.donorTier,
        totalDonatedPln: state.totalDonatedPln,
        lastDonationAt: state.lastDonationAt,
      }),
    }
  )
);

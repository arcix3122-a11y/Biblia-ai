import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  getTierById,
  resolveHighestTier,
  type DonorTierId,
} from "@/data/donationTiers";
import { recordDonationRemote } from "@/services/donation/donationRepository";

export interface VerifiedPurchaseRecord {
  productId: string;
  transactionId: string;
  purchaseToken: string | null;
  verifiedAt: string;
  amountPln: number;
  tierId: DonorTierId;
}

interface DonorState {
  donorTier: DonorTierId | null;
  totalDonatedPln: number;
  lastDonationAt: string | null;
  verifiedPurchases: VerifiedPurchaseRecord[];
  hydrated: boolean;
  recordVerifiedPurchase: (record: VerifiedPurchaseRecord) => Promise<DonorTierId | null>;
  resetDonorState: () => void;
}

function recomputeFromVerifiedPurchases(
  purchases: VerifiedPurchaseRecord[]
): Pick<DonorState, "donorTier" | "totalDonatedPln" | "lastDonationAt"> {
  let donorTier: DonorTierId | null = null;
  let totalDonatedPln = 0;
  let lastDonationAt: string | null = null;

  for (const purchase of purchases) {
    donorTier = resolveHighestTier(donorTier, purchase.tierId);
    totalDonatedPln += purchase.amountPln;
    if (!lastDonationAt || purchase.verifiedAt > lastDonationAt) {
      lastDonationAt = purchase.verifiedAt;
    }
  }

  return { donorTier, totalDonatedPln, lastDonationAt };
}

function isVerifiedPurchaseRecord(record: VerifiedPurchaseRecord): boolean {
  if (!record.transactionId?.trim() || !record.productId?.trim()) {
    return false;
  }

  const isDevSimulated =
    __DEV__ && record.productId.startsWith("dev_") && !record.purchaseToken?.trim();

  if (isDevSimulated) {
    return true;
  }

  return Boolean(record.purchaseToken?.trim());
}

export const useDonorStore = create<DonorState>()(
  persist(
    (set, get) => ({
      donorTier: null,
      totalDonatedPln: 0,
      lastDonationAt: null,
      verifiedPurchases: [],
      hydrated: false,

      recordVerifiedPurchase: async (record) => {
        if (!isVerifiedPurchaseRecord(record)) {
          return get().donorTier;
        }

        const duplicate = get().verifiedPurchases.some(
          (entry) =>
            entry.transactionId === record.transactionId ||
            (record.purchaseToken &&
              entry.purchaseToken &&
              entry.purchaseToken === record.purchaseToken)
        );
        if (duplicate) {
          return get().donorTier;
        }

        const tier = getTierById(record.tierId);
        const verifiedPurchases = [...get().verifiedPurchases, record];
        const derived = recomputeFromVerifiedPurchases(verifiedPurchases);

        set({
          verifiedPurchases,
          ...derived,
        });

        void recordDonationRemote({
          amountPln: tier.amountPln,
          tier: tier.id,
          createdAt: record.verifiedAt,
          productId: record.productId,
          purchaseToken: record.purchaseToken,
        });

        return derived.donorTier;
      },

      resetDonorState: () => {
        set({
          donorTier: null,
          totalDonatedPln: 0,
          lastDonationAt: null,
          verifiedPurchases: [],
        });
      },
    }),
    {
      name: "@biblia-ai/donor",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const verifiedPurchases = state.verifiedPurchases.filter(isVerifiedPurchaseRecord);
          useDonorStore.setState({
            verifiedPurchases,
            ...recomputeFromVerifiedPurchases(verifiedPurchases),
          });
        }
        useDonorStore.setState({ hydrated: true });
      },
      partialize: (state) => ({
        verifiedPurchases: state.verifiedPurchases.filter(isVerifiedPurchaseRecord),
      }),
    }
  )
);

import type { DonorTierId } from "@/data/donationTiers";

/** Default Google Play consumable product IDs — override via EXPO_PUBLIC_IAP_DONATE_* env vars. */
export const DEFAULT_DONATION_PRODUCT_IDS = {
  donate10: "biblia_donate_10",
  donate30: "biblia_donate_30",
  donate50: "biblia_donate_50",
} as const;

export function getDonationProductIds(): Record<DonorTierId, string> {
  return {
    supporter:
      process.env.EXPO_PUBLIC_IAP_DONATE_10?.trim() || DEFAULT_DONATION_PRODUCT_IDS.donate10,
    patron:
      process.env.EXPO_PUBLIC_IAP_DONATE_30?.trim() || DEFAULT_DONATION_PRODUCT_IDS.donate30,
    mecenas:
      process.env.EXPO_PUBLIC_IAP_DONATE_50?.trim() || DEFAULT_DONATION_PRODUCT_IDS.donate50,
  };
}

export function getAllDonationProductIds(): string[] {
  const ids = getDonationProductIds();
  return [ids.supporter, ids.patron, ids.mecenas];
}

export function getProductIdForTierId(tierId: DonorTierId): string {
  return getDonationProductIds()[tierId];
}

export function getTierIdForProductId(productId: string): DonorTierId | null {
  const ids = getDonationProductIds();
  if (productId === ids.supporter) return "supporter";
  if (productId === ids.patron) return "patron";
  if (productId === ids.mecenas) return "mecenas";
  return null;
}

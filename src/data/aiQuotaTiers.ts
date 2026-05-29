import type { DonorTierId } from "@/data/donationTiers";

/** Daily AI message limits per donor tier (free = no tier). */
export const AI_QUOTA_BY_TIER = {
  free: 10,
  supporter: 40,
  patron: 100,
  mecenas: 150,
} as const;

export type AiQuotaTierKey = keyof typeof AI_QUOTA_BY_TIER;

export function getEffectiveLimit(donorTier: DonorTierId | null): number {
  if (!donorTier) {
    return AI_QUOTA_BY_TIER.free;
  }
  return AI_QUOTA_BY_TIER[donorTier];
}

/** Mecenas tier is marketed as unlimited; 150/day is an abuse-protection soft cap. */
export function isUnlimitedQuotaTier(donorTier: DonorTierId | null): boolean {
  return donorTier === "mecenas";
}

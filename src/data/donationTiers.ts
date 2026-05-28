export type DonorTierId = "supporter" | "patron" | "mecenas";

export interface DonationTier {
  id: DonorTierId;
  amountPln: number;
  badgeColor: string;
  badgeBorder: string;
  badgeGlow: string;
}

/** Fixed donation amounts and donor ranks (YouVersion-style tiers). */
export const DONATION_TIERS: readonly DonationTier[] = [
  {
    id: "supporter",
    amountPln: 10,
    badgeColor: "#B8892E",
    badgeBorder: "rgba(184,137,46,0.55)",
    badgeGlow: "rgba(184,137,46,0.18)",
  },
  {
    id: "patron",
    amountPln: 30,
    badgeColor: "#E5A93C",
    badgeBorder: "rgba(229,169,60,0.65)",
    badgeGlow: "rgba(229,169,60,0.22)",
  },
  {
    id: "mecenas",
    amountPln: 50,
    badgeColor: "#F5C86B",
    badgeBorder: "rgba(245,200,107,0.75)",
    badgeGlow: "rgba(245,200,107,0.28)",
  },
] as const;

const TIER_RANK: Record<DonorTierId, number> = {
  supporter: 1,
  patron: 2,
  mecenas: 3,
};

export function getTierByAmount(amountPln: number): DonationTier | null {
  return DONATION_TIERS.find((tier) => tier.amountPln === amountPln) ?? null;
}

export function getTierById(id: DonorTierId): DonationTier {
  const tier = DONATION_TIERS.find((entry) => entry.id === id);
  if (!tier) {
    throw new Error(`Unknown donor tier: ${id}`);
  }
  return tier;
}

/** Keeps the highest rank when multiple donations are recorded. */
export function resolveHighestTier(
  current: DonorTierId | null,
  next: DonorTierId
): DonorTierId {
  if (!current) {
    return next;
  }
  return TIER_RANK[next] > TIER_RANK[current] ? next : current;
}

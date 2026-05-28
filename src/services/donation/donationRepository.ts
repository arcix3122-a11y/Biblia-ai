import type { DonorTierId } from "@/data/donationTiers";
import { getSessionUserIdAsync, getSupabaseClient } from "@/services/supabase/supabaseClient";

export interface DonationRecord {
  amountPln: number;
  tier: DonorTierId;
  createdAt: string;
  productId?: string;
  purchaseToken?: string | null;
}

export async function recordDonationRemote(record: DonationRecord): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  const userId = await getSessionUserIdAsync();
  if (!userId) {
    return;
  }

  const payload: Record<string, unknown> = {
    user_id: userId,
    amount_pln: record.amountPln,
    tier: record.tier,
    created_at: record.createdAt,
  };

  if (record.productId) {
    payload.product_id = record.productId;
  }
  if (record.purchaseToken) {
    payload.purchase_token = record.purchaseToken;
  }

  const { error } = await supabase.from("donations").insert(payload);

  if (error) {
    // Offline-first: local verifiedPurchases remain source of truth for Phase 1.
    return;
  }
}

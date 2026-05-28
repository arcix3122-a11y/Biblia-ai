import type { DonorTierId } from "@/data/donationTiers";
import { getSessionUserIdAsync, getSupabaseClient } from "@/services/supabase/supabaseClient";

export interface DonationRecord {
  amountPln: number;
  tier: DonorTierId;
  createdAt: string;
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

  const { error } = await supabase.from("donations").insert({
    user_id: userId,
    amount_pln: record.amountPln,
    tier: record.tier,
    created_at: record.createdAt,
  });

  if (error) {
    // Offline-first: local store is source of truth for Phase 1.
    return;
  }
}

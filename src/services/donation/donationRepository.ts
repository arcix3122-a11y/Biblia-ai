import type { DonorTierId } from "@/data/donationTiers";
import { getSessionUserIdAsync, getSupabaseClient } from "@/services/supabase/supabaseClient";

export interface DonationRecord {
  amountPln: number;
  tier: DonorTierId;
  createdAt: string;
  productId?: string;
  purchaseToken?: string | null;
}

/**
 * Records a donation remotely via the `verify-donation` Edge Function, which
 * confirms the Google Play purchase token server-side before inserting a row.
 * Clients can no longer insert directly (migration 007), so a purchase token is
 * required. Best-effort: the local donor store stays the source of truth for the
 * badge, so any failure here is silent.
 */
export async function recordDonationRemote(record: DonationRecord): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  // Only server-verifiable Google Play purchases can be recorded remotely.
  if (!record.productId || !record.purchaseToken) {
    return;
  }

  const userId = await getSessionUserIdAsync();
  if (!userId) {
    return;
  }

  try {
    await supabase.functions.invoke("verify-donation", {
      body: {
        productId: record.productId,
        purchaseToken: record.purchaseToken,
      },
    });
  } catch {
    // Offline-first: local verifiedPurchases remain the source of truth.
  }
}

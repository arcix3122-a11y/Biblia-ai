// Biblia AI — Google Play Real-time Developer Notifications (RTDN) webhook.
//
// Receives Pub/Sub push messages from Google Play. On a voided (refunded/charged
// back) purchase it marks the matching donation row refunded and recomputes the
// donor summary on the user's profile, so server-side analytics stay correct.
//
// This endpoint is called by Google Pub/Sub, not the app, so it uses a shared
// secret in the query string instead of a Supabase JWT (deploy with verify_jwt
// = false). Configure the Pub/Sub push endpoint as:
//   https://<project>.supabase.co/functions/v1/play-rtdn?secret=<RTDN_SHARED_SECRET>
//
// Required Edge Function secret:
//   RTDN_SHARED_SECRET   matches the ?secret= in the Pub/Sub push URL
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// Note: the in-app donor badge is local/offline-first by design, so a refund does
// not retroactively remove a badge already on a device. This webhook keeps the
// server record (donations + profile summary) accurate.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TIER_RANK: Record<string, number> = { supporter: 1, patron: 2, mecenas: 3 };

interface VoidedPurchaseNotification {
  purchaseToken?: string;
  orderId?: string;
  productType?: number;
  refundType?: number;
}

interface DeveloperNotification {
  packageName?: string;
  voidedPurchaseNotification?: VoidedPurchaseNotification;
}

async function recomputeProfileSummary(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<void> {
  const { data: rows } = await admin
    .from("donations")
    .select("amount_pln, tier, created_at")
    .eq("user_id", userId)
    .eq("verified", true)
    .eq("refunded", false);

  let total = 0;
  let topTier: string | null = null;
  let last: string | null = null;
  for (const row of rows ?? []) {
    total += row.amount_pln as number;
    const tier = row.tier as string;
    if (!topTier || TIER_RANK[tier] > TIER_RANK[topTier]) topTier = tier;
    const created = row.created_at as string;
    if (!last || created > last) last = created;
  }

  await admin.from("user_profiles").upsert(
    {
      id: userId,
      donor_tier: topTier,
      total_donated_pln: total,
      last_donation_at: last,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }

  const expectedSecret = Deno.env.get("RTDN_SHARED_SECRET");
  if (!expectedSecret) {
    return new Response("not_configured", { status: 501 });
  }
  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== expectedSecret) {
    return new Response("unauthorized", { status: 401 });
  }

  let envelope: { message?: { data?: string } };
  try {
    envelope = await req.json();
  } catch {
    return new Response("bad_request", { status: 400 });
  }

  const dataB64 = envelope.message?.data;
  if (!dataB64) {
    // Pub/Sub verification/empty ping — acknowledge so it is not retried.
    return new Response("ok", { status: 200 });
  }

  let notification: DeveloperNotification;
  try {
    notification = JSON.parse(atob(dataB64));
  } catch {
    return new Response("ok", { status: 200 });
  }

  const voided = notification.voidedPurchaseNotification;
  if (!voided?.purchaseToken) {
    // Not a refund event (e.g. a one-time product purchase notice) — ack.
    return new Response("ok", { status: 200 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: updated, error } = await admin
    .from("donations")
    .update({ refunded: true, refunded_at: new Date().toISOString() })
    .eq("purchase_token", voided.purchaseToken)
    .select("user_id")
    .maybeSingle();

  if (error) {
    // Transient DB error — return 500 so Pub/Sub retries delivery.
    return new Response("db_error", { status: 500 });
  }

  if (updated?.user_id) {
    try {
      await recomputeProfileSummary(admin, updated.user_id as string);
    } catch {
      // summary best-effort
    }
  }

  return new Response("ok", { status: 200 });
});

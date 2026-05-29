// Biblia AI — verify a Google Play donation purchase server-side, then record it.
//
// The client sends { productId, purchaseToken }. We confirm the caller's identity
// from their Supabase JWT, verify the token against the Google Play Developer API
// using a service account, and only then insert a verified donation row (service
// role) and refresh the user's donor summary. This makes the donations table
// trustworthy — clients can no longer self-insert (see migration 007).
//
// Required Edge Function secrets (Supabase → Project Settings → Edge Functions):
//   GOOGLE_PLAY_SA_CLIENT_EMAIL   service account email
//   GOOGLE_PLAY_SA_PRIVATE_KEY    service account private key (PEM; \n escaped is OK)
//   ANDROID_PACKAGE_NAME          optional, defaults to com.solidcodeapps.bibliaai
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ProductInfo {
  tier: "supporter" | "patron" | "mecenas";
  amountPln: number;
}

const PRODUCTS: Record<string, ProductInfo> = {
  [Deno.env.get("IAP_DONATE_10") ?? "biblia_donate_10"]: { tier: "supporter", amountPln: 10 },
  [Deno.env.get("IAP_DONATE_30") ?? "biblia_donate_30"]: { tier: "patron", amountPln: 30 },
  [Deno.env.get("IAP_DONATE_50") ?? "biblia_donate_50"]: { tier: "mecenas", amountPln: 50 },
};

const TIER_RANK: Record<string, number> = { supporter: 1, patron: 2, mecenas: 3 };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function getGoogleAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}`,
  });
  if (!res.ok) {
    throw new Error(`google_oauth_failed ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    return json({ error: "unauthorized" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return json({ error: "unauthorized" }, 401);
  }
  const userId = userData.user.id;

  let payload: { productId?: string; purchaseToken?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const productId = String(payload.productId ?? "").trim();
  const purchaseToken = String(payload.purchaseToken ?? "").trim();
  if (!productId || !purchaseToken) {
    return json({ error: "bad_request" }, 400);
  }

  const product = PRODUCTS[productId];
  if (!product) {
    return json({ error: "unknown_product" }, 400);
  }

  const clientEmail = Deno.env.get("GOOGLE_PLAY_SA_CLIENT_EMAIL");
  const privateKey = (Deno.env.get("GOOGLE_PLAY_SA_PRIVATE_KEY") ?? "").replace(/\\n/g, "\n");
  const packageName = Deno.env.get("ANDROID_PACKAGE_NAME") ?? "com.solidcodeapps.bibliaai";
  if (!clientEmail || !privateKey) {
    // Verification is not configured yet — refuse rather than trust the client.
    return json({ error: "verification_not_configured" }, 501);
  }

  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken(clientEmail, privateKey);
  } catch (e) {
    return json({ error: "google_auth_failed", detail: String(e) }, 502);
  }

  const verifyUrl =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${packageName}/purchases/products/${encodeURIComponent(productId)}/tokens/` +
    `${encodeURIComponent(purchaseToken)}`;

  const gRes = await fetch(verifyUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (gRes.status === 404 || gRes.status === 410) {
    return json({ verified: false, error: "purchase_not_found" });
  }
  if (!gRes.ok) {
    return json({ error: "google_verify_failed", status: gRes.status, detail: await gRes.text() }, 502);
  }

  const purchase = await gRes.json();
  // purchaseState: 0 = Purchased, 1 = Canceled, 2 = Pending
  if (purchase.purchaseState !== 0) {
    return json({ verified: false, error: "not_purchased", purchaseState: purchase.purchaseState });
  }

  const { error: insErr } = await admin.from("donations").upsert(
    {
      user_id: userId,
      amount_pln: product.amountPln,
      tier: product.tier,
      product_id: productId,
      purchase_token: purchaseToken,
      verified: true,
      verified_at: new Date().toISOString(),
    },
    { onConflict: "purchase_token", ignoreDuplicates: true },
  );
  if (insErr) {
    return json({ error: "db_insert_failed", detail: insErr.message }, 500);
  }

  // Refresh the donor summary on the profile (best-effort).
  try {
    const { data: rows } = await admin
      .from("donations")
      .select("amount_pln, tier, created_at")
      .eq("user_id", userId)
      .eq("verified", true)
      .eq("refunded", false);

    if (rows && rows.length > 0) {
      let total = 0;
      let topTier = "supporter";
      let last: string | null = null;
      for (const row of rows) {
        total += row.amount_pln as number;
        if (TIER_RANK[row.tier as string] > TIER_RANK[topTier]) {
          topTier = row.tier as string;
        }
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
  } catch {
    // summary is best-effort; the verified donation row is already recorded
  }

  return json({ verified: true, tier: product.tier });
});

# Google Play in-app purchases (Biblia AI)

Production donations use **three consumable in-app products** via `react-native-iap`. Ranks unlock only after Google Play confirms payment and the app finishes the consumable transaction.

## Prerequisites

- Google Play Console app: **Biblia AI** (`com.solidcodeapps.bibliaai`)
- App uploaded to at least **Internal testing** (IAP does not work in Expo Go)
- EAS build profile `production` (see `eas.json`) — outputs an **AAB** for Play Store
- Merchant account / payments profile active in Play Console

## 1. Create in-app products

In [Google Play Console](https://play.google.com/console) → **Monetize** → **Products** → **In-app products** → **Create product**.

Create **three consumables** with these exact product IDs (defaults in app code):

| Product ID | Suggested name | Tier | Suggested price |
|------------|----------------|------|-----------------|
| `biblia_donate_10` | Supporter badge | Supporter | 10 PLN |
| `biblia_donate_30` | Patron badge | Patron | 30 PLN |
| `biblia_donate_50` | Benefactor badge | Benefactor | 50 PLN |

> **Play policy framing:** these are sold as **digital products** (a profile supporter badge), not charitable donations. Keep all Console names/descriptions and in-app copy in "supporter badge / unlock a badge" language. A purchase must grant the digital benefit (the badge) — which it does. Do not describe them as "donations", "charity", or "tax-deductible".

For each product:

1. **Product ID** — use the table above (must match exactly).
2. **Name** — short display name (localized PL + EN if offered), e.g. "Supporter badge".
3. **Description** — one-time purchase that unlocks a digital supporter badge on the user's profile.
4. **Status** — set to **Active** after saving.
5. **Product type** — **Consumable** (one-time; user can buy again to keep supporting).

Optional: override IDs via env vars in EAS secrets or `.env`:

```bash
EXPO_PUBLIC_IAP_DONATE_10=biblia_donate_10
EXPO_PUBLIC_IAP_DONATE_30=biblia_donate_30
EXPO_PUBLIC_IAP_DONATE_50=biblia_donate_50
```

## 2. License testers

**Setup** → **License testing** → add Gmail accounts used for QA. Testers can buy without real charges when the app is on an internal/closed track.

## 3. Build and upload

From the project root:

```bash
npm install
eas build --platform android --profile production
```

After the build completes, submit to Play (internal track first):

```bash
eas submit --platform android --profile production
```

Or upload the AAB manually in Play Console → **Release** → **Testing** → **Internal testing**.

## 4. Link app to products

- The uploaded release must use the same `applicationId`: `com.solidcodeapps.bibliaai`.
- Products appear in the app only after they are **Active** and the signed build is on a testing or production track.
- Wait up to a few hours after creating products before first fetch in the app.

## 5. Test purchase flow

1. Install the **internal testing** build from Play (not Expo Go).
2. Open **Settings → Donation** or the Home support card.
3. Tap a tier → Google Play sheet → complete test purchase.
4. Confirm thank-you screen and donor badge in Settings.
5. Repeat same tier — consumables allow multiple gifts.

### Error cases to verify

| Scenario | Expected UI |
|----------|-------------|
| Expo Go | “Play required” notice; tiers disabled |
| User cancels sheet | “Purchase cancelled” |
| Billing unavailable | “Google Play Billing is unavailable…” |
| Pending payment | “Payment is pending…” |
| Stuck consumable | “Previous gift is still processing…” then retry |

## 6. App configuration (already in repo)

- `react-native-iap` + `react-native-nitro-modules` in `package.json`
- Expo plugin `"react-native-iap"` in `app.json` (adds `com.android.vending.BILLING`)
- Android permission `com.android.vending.BILLING` in `app.json`
- Purchase flow: `requestPurchase` → `purchaseUpdatedListener` → `finishTransaction` (consumable) → `donorStore.recordVerifiedPurchase` (requires `purchaseToken`)

## 7. Play Console checklist before public release

- [ ] All three products **Active**
- [ ] Prices set for target countries (PL primary)
- [ ] Internal testing purchase successful on physical device
- [ ] Closed testing (optional) with real payment profile
- [x] Privacy policy UI integrated in app (Settings screen)
- [ ] Privacy policy URL set in Play Console (donations = payments) — e.g. hosted at `https://biblia-asystent-privacy.surge.sh/privacy-policy.html` (via Surge static web publishing)
- [ ] App content / target audience forms complete
- [ ] Production release promoted after QA

## 8. Server-side verification (Supabase Edge Functions)

The donor **badge** is granted locally as soon as Google Play confirms the purchase (requires a real `purchaseToken`). The **remote** `donations` table is now write-protected: clients can no longer insert (migration `007_donations_verification.sql`). All remote records go through the `verify-donation` Edge Function, which confirms the token with the Google Play Developer API before inserting a `verified` row and refreshing the donor summary on `user_profiles`.

> Until the service account below is configured, `verify-donation` returns `verification_not_configured` and **no remote rows are written** — the in-app badge still works (it is local). Configure the secrets to enable remote logging + analytics.

### 8.1 Create a service account (one-time)

1. Google Play Console → **Setup → API access** → link a Google Cloud project.
2. In Google Cloud → **IAM & Admin → Service accounts** → create one, no roles needed.
3. Create a **JSON key** for it (you will use `client_email` and `private_key`).
4. Back in Play Console → **API access** → grant the service account access with permission **View financial data, orders, and cancellation survey responses** (enough for `purchases.products.get`).
5. Enable the **Google Play Android Developer API** in the Cloud project.

### 8.2 Set Edge Function secrets

Supabase → **Project Settings → Edge Functions → Secrets** (or `supabase secrets set`):

```bash
GOOGLE_PLAY_SA_CLIENT_EMAIL=<service-account>@<project>.iam.gserviceaccount.com
GOOGLE_PLAY_SA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# optional, defaults to com.solidcodeapps.bibliaai
ANDROID_PACKAGE_NAME=com.solidcodeapps.bibliaai
```

The app calls the function automatically after a successful purchase (`recordDonationRemote` → `supabase.functions.invoke("verify-donation")`).

### 8.3 Refunds / chargebacks (RTDN webhook — optional)

The `play-rtdn` Edge Function marks a donation `refunded` and recomputes the profile summary when Google reports a voided purchase. Wire it up with Real-time Developer Notifications:

1. Set a secret `RTDN_SHARED_SECRET=<random-string>` in Edge Function secrets.
2. Google Cloud → **Pub/Sub** → create a topic; add a **push subscription** with endpoint:
   `https://<project-ref>.supabase.co/functions/v1/play-rtdn?secret=<RTDN_SHARED_SECRET>`
3. Play Console → **Monetization setup → Real-time developer notifications** → set the topic.
4. Grant `google-play-developer-notifications@system.gserviceaccount.com` the **Pub/Sub Publisher** role on the topic.

> The local badge is offline-first and is **not** removed retroactively on refund; the webhook keeps the server record (donations + profile summary) accurate.

## Troubleshooting

- **Products not loading** — product IDs mismatch, products not Active, or app not signed with Play upload key.
- **“Item unavailable”** — app version on track does not match Console app, or tester not on license list.
- **Rank not granted** — check log for missing `purchaseToken`; only verified IAP records persist tier (no manual confirm in production).

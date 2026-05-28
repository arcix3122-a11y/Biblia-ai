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
| `biblia_donate_10` | Supporter gift | Supporter | 10 PLN |
| `biblia_donate_30` | Patron gift | Patron | 30 PLN |
| `biblia_donate_50` | Benefactor gift | Benefactor | 50 PLN |

For each product:

1. **Product ID** — use the table above (must match exactly).
2. **Name** — short display name (localized PL + EN if offered).
3. **Description** — one-time voluntary gift; unlocks a supporter badge.
4. **Status** — set to **Active** after saving.
5. **Product type** — **Consumable** (one-time; user can donate again).

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
- [ ] Privacy policy URL set (donations = payments)
- [ ] App content / target audience forms complete
- [ ] Production release promoted after QA

## 8. Server-side (optional)

Verified purchases optionally log to Supabase `donations` with `product_id` and `purchase_token` (migration `006_donations_iap_fields.sql`). Play server verification can be added later; client-side finish + token persistence is sufficient for launch.

## Troubleshooting

- **Products not loading** — product IDs mismatch, products not Active, or app not signed with Play upload key.
- **“Item unavailable”** — app version on track does not match Console app, or tester not on license list.
- **Rank not granted** — check log for missing `purchaseToken`; only verified IAP records persist tier (no manual confirm in production).

import { Platform } from "react-native";
import {
  getAllDonationProductIds,
  getProductIdForTierId,
  getTierIdForProductId,
} from "@/data/donationProducts";
import { getTierById, type DonorTierId } from "@/data/donationTiers";
import { isExpoGoClient } from "@/services/notifications/reminderService";
import { useDonorStore } from "@/store/donorStore";

type IapModule = typeof import("react-native-iap");
type IapProduct = import("react-native-iap").Product;
type IapPurchase = import("react-native-iap").Purchase;
type IapPurchaseError = import("react-native-iap").PurchaseError;
type IapEventSubscription = import("react-native-iap").EventSubscription;

let connectionActive = false;
let iapModulePromise: Promise<IapModule | null> | null = null;
let updateSubscription: IapEventSubscription | null = null;
let errorSubscription: IapEventSubscription | null = null;

export type DonationIapMessageKey =
  | "donation.iap.playRequired"
  | "donation.iap.errors.cancelled"
  | "donation.iap.errors.connectionFailed"
  | "donation.iap.errors.productsFailed"
  | "donation.iap.errors.purchaseFailed"
  | "donation.iap.errors.verifyFailed"
  | "donation.iap.errors.unknownProduct"
  | "donation.iap.errors.billingUnavailable"
  | "donation.iap.errors.pending"
  | "donation.iap.errors.alreadyOwned";

export type DonationPurchaseHandler = (tierId: DonorTierId) => void;
export type DonationPurchaseErrorHandler = (errorKey: DonationIapMessageKey) => void;

/** IAP requires a dev or store build — not available in Expo Go. */
export function isDonationIapAvailable(): boolean {
  return !isExpoGoClient() && (Platform.OS === "android" || Platform.OS === "ios");
}

function isDonationProductId(productId: string): boolean {
  return getAllDonationProductIds().includes(productId);
}

function mapPurchaseError(error: IapPurchaseError, iap: IapModule): DonationIapMessageKey {
  switch (error.code) {
    case iap.ErrorCode.UserCancelled:
      return "donation.iap.errors.cancelled";
    case iap.ErrorCode.BillingUnavailable:
    case iap.ErrorCode.IapNotAvailable:
    case iap.ErrorCode.FeatureNotSupported:
      return "donation.iap.errors.billingUnavailable";
    case iap.ErrorCode.Pending:
    case iap.ErrorCode.DeferredPayment:
      return "donation.iap.errors.pending";
    case iap.ErrorCode.AlreadyOwned:
      return "donation.iap.errors.alreadyOwned";
    default:
      return "donation.iap.errors.purchaseFailed";
  }
}

async function getIapModule(): Promise<IapModule | null> {
  if (!isDonationIapAvailable()) {
    return null;
  }
  if (!iapModulePromise) {
    iapModulePromise = import("react-native-iap").catch(() => null);
  }
  return iapModulePromise;
}

export async function initDonationIapConnection(): Promise<boolean> {
  const iap = await getIapModule();
  if (!iap) {
    return false;
  }
  if (connectionActive) {
    return true;
  }
  try {
    await iap.initConnection();
    connectionActive = true;
    return true;
  } catch {
    connectionActive = false;
    return false;
  }
}

export async function endDonationIapConnection(): Promise<void> {
  updateSubscription?.remove();
  errorSubscription?.remove();
  updateSubscription = null;
  errorSubscription = null;
  const iap = await getIapModule();
  if (!iap || !connectionActive) {
    return;
  }
  try {
    await iap.endConnection();
  } catch {
    // ignore teardown errors
  } finally {
    connectionActive = false;
  }
}

export async function fetchDonationProducts(): Promise<IapProduct[]> {
  const iap = await getIapModule();
  if (!iap) {
    return [];
  }
  const skus = getAllDonationProductIds();
  const products = await iap.fetchProducts({ skus, type: "in-app" });
  return (products ?? []).filter((product): product is IapProduct => product.type === "in-app");
}

/**
 * Finishes any unconsumed donation purchases still owned by the user.
 * Updates donor tier silently — no UI callback.
 */
export async function recoverUnfinishedDonationPurchases(): Promise<void> {
  const iap = await getIapModule();
  if (!iap || !connectionActive) {
    return;
  }

  try {
    const purchases = await iap.getAvailablePurchases();
    for (const purchase of purchases) {
      if (!isDonationProductId(purchase.productId)) {
        continue;
      }
      if (purchase.purchaseState === "pending") {
        continue;
      }
      await finalizeVerifiedPurchase(purchase);
    }
  } catch {
    // ignore recovery errors — user can retry purchase
  }
}

export function subscribeDonationPurchaseListeners(
  onSuccess: DonationPurchaseHandler,
  onError: DonationPurchaseErrorHandler
): () => void {
  let cancelled = false;

  void (async () => {
    const iap = await getIapModule();
    if (!iap || cancelled) {
      return;
    }

    updateSubscription?.remove();
    errorSubscription?.remove();

    updateSubscription = iap.purchaseUpdatedListener(async (purchase) => {
      try {
        if (!isDonationProductId(purchase.productId)) {
          return;
        }

        if (purchase.purchaseState === "pending") {
          onError("donation.iap.errors.pending");
          return;
        }

        const tierId = await finalizeVerifiedPurchase(purchase);
        if (tierId) {
          onSuccess(tierId);
        } else {
          onError("donation.iap.errors.unknownProduct");
        }
      } catch {
        onError("donation.iap.errors.verifyFailed");
      }
    });

    errorSubscription = iap.purchaseErrorListener((error) => {
      if (error.code === iap.ErrorCode.AlreadyOwned) {
        void recoverUnfinishedDonationPurchases();
      }
      onError(mapPurchaseError(error, iap));
    });
  })();

  return () => {
    cancelled = true;
    updateSubscription?.remove();
    errorSubscription?.remove();
    updateSubscription = null;
    errorSubscription = null;
  };
}

export async function requestDonationPurchase(tierId: DonorTierId): Promise<void> {
  const iap = await getIapModule();
  if (!iap) {
    throw new Error("IAP unavailable");
  }
  const productId = getProductIdForTierId(tierId);
  await iap.requestPurchase({
    type: "in-app",
    request: {
      apple: { sku: productId },
      google: { skus: [productId] },
    },
  });
}

/**
 * Acknowledges a consumable purchase and records donor tier locally + optional Supabase row.
 * Consumables cannot restore rank on a new device without purchase history — by design.
 */
export async function finalizeVerifiedPurchase(purchase: IapPurchase): Promise<DonorTierId | null> {
  const iap = await getIapModule();
  if (!iap) {
    return null;
  }

  const tierId = getTierIdForProductId(purchase.productId);
  if (!tierId) {
    return null;
  }

  if (purchase.purchaseState === "pending") {
    return null;
  }

  const tier = getTierById(tierId);
  const transactionId = purchase.transactionId ?? purchase.id;

  await iap.finishTransaction({ purchase, isConsumable: true });

  return useDonorStore.getState().recordVerifiedPurchase({
    productId: purchase.productId,
    transactionId,
    purchaseToken: purchase.purchaseToken ?? null,
    verifiedAt: new Date().toISOString(),
    amountPln: tier.amountPln,
    tierId,
  });
}

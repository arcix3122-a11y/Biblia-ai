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
type IapEventSubscription = import("react-native-iap").EventSubscription;

let connectionActive = false;
let iapModulePromise: Promise<IapModule | null> | null = null;
let updateSubscription: IapEventSubscription | null = null;
let errorSubscription: IapEventSubscription | null = null;

export type DonationIapMessageKey =
  | "donation.iap.expoGoNotice"
  | "donation.iap.errors.cancelled"
  | "donation.iap.errors.connectionFailed"
  | "donation.iap.errors.productsFailed"
  | "donation.iap.errors.purchaseFailed"
  | "donation.iap.errors.verifyFailed"
  | "donation.iap.errors.unknownProduct";

export type DonationPurchaseHandler = (tierId: DonorTierId) => void;
export type DonationPurchaseErrorHandler = (errorKey: DonationIapMessageKey) => void;

/** IAP requires a dev or store build — not available in Expo Go. */
export function isDonationIapAvailable(): boolean {
  return !isExpoGoClient() && (Platform.OS === "android" || Platform.OS === "ios");
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
  errorSubscription = null;
  updateSubscription = null;
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
      if (error.code === iap.ErrorCode.UserCancelled) {
        onError("donation.iap.errors.cancelled");
        return;
      }
      onError("donation.iap.errors.purchaseFailed");
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

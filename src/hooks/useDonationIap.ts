import { useCallback, useEffect, useRef, useState } from "react";
import type { DonorTierId } from "@/data/donationTiers";
import { getProductIdForTierId } from "@/data/donationProducts";
import {
  endDonationIapConnection,
  fetchDonationProducts,
  initDonationIapConnection,
  isDonationIapAvailable,
  recoverUnfinishedDonationPurchases,
  requestDonationPurchase,
  subscribeDonationPurchaseListeners,
  type DonationIapMessageKey,
} from "@/services/donation/iapService";

type StoreProduct = Awaited<ReturnType<typeof fetchDonationProducts>>[number];

export type DonationIapStatus = "idle" | "connecting" | "purchasing" | "error";

interface UseDonationIapOptions {
  onPurchaseSuccess: (tierId: DonorTierId) => void;
}

export function useDonationIap({ onPurchaseSuccess }: UseDonationIapOptions) {
  const iapAvailable = isDonationIapAvailable();
  const [status, setStatus] = useState<DonationIapStatus>("idle");
  const [errorKey, setErrorKey] = useState<DonationIapMessageKey | null>(null);
  const [productsById, setProductsById] = useState<Record<string, StoreProduct>>({});
  const [activeTierId, setActiveTierId] = useState<DonorTierId | null>(null);
  const onSuccessRef = useRef(onPurchaseSuccess);

  useEffect(() => {
    onSuccessRef.current = onPurchaseSuccess;
  }, [onPurchaseSuccess]);

  useEffect(() => {
    if (!iapAvailable) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setStatus("connecting");
      const connected = await initDonationIapConnection();
      if (cancelled) {
        return;
      }
      if (!connected) {
        setStatus("error");
        setErrorKey("donation.iap.errors.connectionFailed");
        return;
      }

      await recoverUnfinishedDonationPurchases();

      try {
        const products = await fetchDonationProducts();
        if (cancelled) {
          return;
        }
        const map: Record<string, StoreProduct> = {};
        for (const product of products) {
          map[product.id] = product;
        }
        setProductsById(map);
        setStatus("idle");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setErrorKey("donation.iap.errors.productsFailed");
        }
      }
    })();

    const unsubscribe = subscribeDonationPurchaseListeners(
      (tierId) => {
        setActiveTierId(null);
        setStatus("idle");
        setErrorKey(null);
        onSuccessRef.current(tierId);
      },
      (key) => {
        setActiveTierId(null);
        if (key === "donation.iap.errors.cancelled") {
          setStatus("idle");
        } else if (key === "donation.iap.errors.pending") {
          setStatus("idle");
        } else {
          setStatus("error");
        }
        setErrorKey(key);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
      void endDonationIapConnection();
    };
  }, [iapAvailable]);

  const purchaseTier = useCallback(
    async (tierId: DonorTierId) => {
      if (!iapAvailable) {
        setErrorKey("donation.iap.playRequired");
        return;
      }
      setErrorKey(null);
      setActiveTierId(tierId);
      setStatus("purchasing");
      try {
        await requestDonationPurchase(tierId);
      } catch {
        setActiveTierId(null);
        setStatus("error");
        setErrorKey("donation.iap.errors.purchaseFailed");
      }
    },
    [iapAvailable]
  );

  const getDisplayPrice = useCallback(
    (tierId: DonorTierId, fallback: string): string => {
      const product = productsById[getProductIdForTierId(tierId)];
      return product?.displayPrice ?? fallback;
    },
    [productsById]
  );

  const clearError = useCallback(() => {
    setErrorKey(null);
    if (status === "error") {
      setStatus("idle");
    }
  }, [status]);

  return {
    iapAvailable,
    status,
    errorKey,
    activeTierId,
    purchaseTier,
    getDisplayPrice,
    clearError,
    isBusy: status === "connecting" || status === "purchasing",
  };
}

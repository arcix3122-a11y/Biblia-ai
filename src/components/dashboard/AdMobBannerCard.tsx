import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { NativeAdCard } from "@/components/dashboard/NativeAdCard";
import { canServeAdMob, getHomeBannerUnitId } from "@/services/ads/adConfig";
import { useDonorStore } from "@/store/donorStore";
import { colors, radii, spacing } from "@/theme";

type AdsModule = typeof import("react-native-google-mobile-ads");

function loadAdsModule(): AdsModule | null {
  try {
    return require("react-native-google-mobile-ads") as AdsModule;
  } catch {
    return null;
  }
}

export function AdMobBannerCard() {
  const donorTier = useDonorStore((s) => s.donorTier);
  const [adsModule, setAdsModule] = useState<AdsModule | null>(null);

  useEffect(() => {
    if (donorTier !== null || !canServeAdMob()) {
      return;
    }
    setAdsModule(loadAdsModule());
  }, [donorTier]);

  if (donorTier !== null) {
    return null;
  }

  if (!canServeAdMob() || !adsModule) {
    return <NativeAdCard />;
  }

  const BannerAd = adsModule.BannerAd;
  const BannerAdSize = adsModule.BannerAdSize;

  return (
    <View style={styles.bannerWrap}>
      <BannerAd
        unitId={getHomeBannerUnitId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bannerWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 64,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
    overflow: "hidden",
  },
});

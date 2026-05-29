import Constants from "expo-constants";
import { Linking, Platform } from "react-native";

const FALLBACK_ANDROID_PACKAGE = "com.solidcodeapps.bibliaai";

function getAndroidPackageName(): string {
  return Constants.expoConfig?.android?.package ?? FALLBACK_ANDROID_PACKAGE;
}

export async function openStoreReviewPage(): Promise<boolean> {
  if (Platform.OS === "android") {
    const packageName = getAndroidPackageName();
    const marketUrl = `market://details?id=${packageName}`;
    const webUrl = `https://play.google.com/store/apps/details?id=${packageName}`;

    const canOpenMarket = await Linking.canOpenURL(marketUrl);
    await Linking.openURL(canOpenMarket ? marketUrl : webUrl);
    return true;
  }

  // iOS needs a concrete App Store numeric id; skip until configured.
  return false;
}

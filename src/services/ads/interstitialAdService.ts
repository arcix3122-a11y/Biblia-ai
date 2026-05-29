import { getCoreInterstitialUnitId, canServeAdMob } from "@/services/ads/adConfig";

type AdModule = typeof import("react-native-google-mobile-ads");

type ShowOptions = {
  isAdFree: boolean;
  minIntervalMs?: number;
};

const DEFAULT_MIN_INTERVAL_MS = 15 * 60 * 1000;
const MAX_SHOWS_PER_SESSION = 2;

let adModule: AdModule | null | undefined;
let interstitial: ReturnType<AdModule["InterstitialAd"]["createForAdRequest"]> | null = null;
let initialized = false;
let loaded = false;
let showsThisSession = 0;
let lastShownAt = 0;

function getAdModule(): AdModule | null {
  if (adModule !== undefined) {
    return adModule;
  }

  try {
    adModule = require("react-native-google-mobile-ads") as AdModule;
  } catch {
    adModule = null;
  }

  return adModule;
}

function loadNext(): void {
  if (!interstitial) {
    return;
  }
  try {
    interstitial.load();
  } catch {
    // ignore and retry on next init/show attempt
  }
}

function initInterstitialOnce(): void {
  if (initialized || !canServeAdMob()) {
    return;
  }

  const ads = getAdModule();
  if (!ads) {
    return;
  }

  const unitId = getCoreInterstitialUnitId();
  interstitial = ads.InterstitialAd.createForAdRequest(unitId, {
    requestNonPersonalizedAdsOnly: true,
  });

  interstitial.addAdEventListener(ads.AdEventType.LOADED, () => {
    loaded = true;
  });

  interstitial.addAdEventListener(ads.AdEventType.CLOSED, () => {
    loaded = false;
    loadNext();
  });

  interstitial.addAdEventListener(ads.AdEventType.ERROR, () => {
    loaded = false;
    setTimeout(loadNext, 5000);
  });

  initialized = true;
  loadNext();
}

export function primeInterstitialAds(): void {
  initInterstitialOnce();
}

export function tryShowCoreInterstitial(options: ShowOptions): boolean {
  if (options.isAdFree || !canServeAdMob()) {
    return false;
  }

  initInterstitialOnce();

  if (!interstitial || !loaded) {
    return false;
  }

  if (showsThisSession >= MAX_SHOWS_PER_SESSION) {
    return false;
  }

  const minIntervalMs = options.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
  if (Date.now() - lastShownAt < minIntervalMs) {
    return false;
  }

  try {
    interstitial.show();
    showsThisSession += 1;
    lastShownAt = Date.now();
    loaded = false;
    return true;
  } catch {
    return false;
  }
}

import i18n from "@/i18n";

export function getAppStoreUrl(): string | undefined {
  const url = process.env.EXPO_PUBLIC_APP_STORE_URL?.trim();
  return url || undefined;
}

export function getPlayStoreUrl(): string | undefined {
  const url = process.env.EXPO_PUBLIC_PLAY_STORE_URL?.trim();
  return url || undefined;
}

/** Appended to invite/streak/practice share messages when store URLs are configured. */
export function formatStoreLinksBlock(): string {
  const iosUrl = getAppStoreUrl();
  const androidUrl = getPlayStoreUrl();

  if (iosUrl && androidUrl) {
    return i18n.t("share.storeLinksBoth", { iosUrl, androidUrl });
  }
  if (iosUrl) {
    return i18n.t("share.storeLinksIos", { iosUrl });
  }
  if (androidUrl) {
    return i18n.t("share.storeLinksAndroid", { androidUrl });
  }
  return "";
}

export function appendStoreLinks(message: string): string {
  const stores = formatStoreLinksBlock();
  if (!stores) {
    return message;
  }
  return `${message}\n\n${stores}`;
}

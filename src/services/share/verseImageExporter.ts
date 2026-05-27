import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import type { RefObject } from "react";
import type { View } from "react-native";
import i18n from "@/i18n";

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

export async function captureVerseStory(
  viewRef: RefObject<View | null>
): Promise<string | null> {
  if (!viewRef.current) {
    return null;
  }

  const uri = await captureRef(viewRef, {
    format: "png",
    quality: 1,
    result: "tmpfile",
    width: STORY_WIDTH,
    height: STORY_HEIGHT,
  });

  return uri;
}

export async function shareVerseImage(uri: string, message?: string): Promise<boolean> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    return false;
  }

  if (message) {
    const { Share, Platform } = await import("react-native");
    if (Platform.OS === "ios") {
      await Share.share({
        message,
        url: uri,
        title: i18n.t("share.dialogTitle"),
      });
      return true;
    }
  }

  await Sharing.shareAsync(uri, {
    mimeType: "image/png",
    dialogTitle: i18n.t("share.dialogTitle"),
    UTI: "public.png",
  });

  if (message) {
    const { Share } = await import("react-native");
    await Share.share({ message, title: i18n.t("share.dialogTitle") });
  }

  return true;
}

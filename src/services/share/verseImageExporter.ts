import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import type { RefObject } from "react";
import type { View } from "react-native";

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

export async function shareVerseImage(uri: string): Promise<boolean> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    return false;
  }

  await Sharing.shareAsync(uri, {
    mimeType: "image/png",
    dialogTitle: "Share verse",
    UTI: "public.png",
  });

  return true;
}

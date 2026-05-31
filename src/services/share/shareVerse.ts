import { Platform, Share } from "react-native";
import * as Sharing from "expo-sharing";
import i18n from "@/i18n";
import { buildReaderDeepLink, buildShareUrl, formatShareLinkLine } from "@/utils/deepLinks";
import { shareVerseImage } from "./verseImageExporter";

const EXCERPT_MAX = 140;

function excerpt(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= EXCERPT_MAX) {
    return trimmed;
  }
  return `${trimmed.slice(0, EXCERPT_MAX).trim()}…`;
}

export interface VerseSharePayload {
  reference: string;
  text: string;
  bookSlug: string;
  chapter: number;
  verse: number;
}

export function buildVerseShareMessage(payload: VerseSharePayload): string {
  const deepLink = buildReaderDeepLink(payload.bookSlug, payload.chapter, payload.verse);
  const publicUrl = buildShareUrl(payload.bookSlug, payload.chapter, payload.verse);
  const linkLine = formatShareLinkLine(deepLink, publicUrl);

  return i18n.t("share.verseMessage", {
    reference: payload.reference,
    excerpt: excerpt(payload.text),
    link: linkLine,
  });
}

/**
 * Share verse text + deep link, optionally with a captured story image.
 * Falls back to text-only when image capture or native share sheet fails.
 */
export async function shareVerse(
  payload: VerseSharePayload,
  imageUri?: string | null
): Promise<void> {
  const message = buildVerseShareMessage(payload);
  const title = i18n.t("share.dialogTitle");

  if (imageUri) {
    try {
      const success = await shareVerseImage(imageUri, message);
      if (success) {
        return;
      }
    } catch (err) {
      console.warn("Failed to share verse image, falling back to text:", err);
    }
  }

  await Share.share({ message, title });
}

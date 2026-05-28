import { Share } from "react-native";
import i18n from "@/i18n";
import type { PracticeId } from "@/data/practices";
import { appendStoreLinks } from "@/services/share/storeLinks";
import {
  buildInviteDeepLink,
  buildInviteShareUrl,
  buildPracticeShareDeepLink,
  buildPracticeShareUrl,
  buildStreakShareDeepLink,
  buildStreakShareUrl,
  formatShareLinkLine,
} from "@/utils/deepLinks";

export interface PracticeSharePayload {
  practiceId: PracticeId;
  practiceName: string;
  day: number;
}

function shareTitle(key: "share.inviteDialogTitle" | "share.streakDialogTitle" | "share.practiceDialogTitle") {
  return i18n.t(key);
}

export function buildInviteShareMessage(): string {
  const deepLink = buildInviteDeepLink();
  const publicUrl = buildInviteShareUrl();
  const linkLine = formatShareLinkLine(deepLink, publicUrl);

  return appendStoreLinks(
    i18n.t("share.inviteMessage", {
      brand: i18n.t("share.brand"),
      link: linkLine,
    })
  );
}

export function buildStreakShareMessage(streakDays: number): string {
  const deepLink = buildStreakShareDeepLink(streakDays);
  const publicUrl = buildStreakShareUrl(streakDays);
  const linkLine = formatShareLinkLine(deepLink, publicUrl);

  return appendStoreLinks(
    i18n.t("share.streakMessage", {
      count: streakDays,
      brand: i18n.t("share.brand"),
      link: linkLine,
    })
  );
}

export function buildPracticeCompletionShareMessage(payload: PracticeSharePayload): string {
  const deepLink = buildPracticeShareDeepLink(payload.practiceId, payload.day);
  const publicUrl = buildPracticeShareUrl(payload.practiceId, payload.day);
  const linkLine = formatShareLinkLine(deepLink, publicUrl);

  return appendStoreLinks(
    i18n.t("share.practiceMessage", {
      day: payload.day,
      practice: payload.practiceName,
      brand: i18n.t("share.brand"),
      link: linkLine,
    })
  );
}

export async function shareInvite(): Promise<void> {
  await Share.share({
    message: buildInviteShareMessage(),
    title: shareTitle("share.inviteDialogTitle"),
  });
}

export async function shareStreak(streakDays: number): Promise<void> {
  const safeDays = Math.max(1, Math.floor(streakDays));
  await Share.share({
    message: buildStreakShareMessage(safeDays),
    title: shareTitle("share.streakDialogTitle"),
  });
}

export async function sharePracticeCompletion(payload: PracticeSharePayload): Promise<void> {
  const safeDay = Math.max(1, Math.floor(payload.day));
  await Share.share({
    message: buildPracticeCompletionShareMessage({ ...payload, day: safeDay }),
    title: shareTitle("share.practiceDialogTitle"),
  });
}

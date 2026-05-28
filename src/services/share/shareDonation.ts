import { Share } from "react-native";
import i18n from "@/i18n";
import type { DonorTierId } from "@/data/donationTiers";
import { appendStoreLinks } from "@/services/share/storeLinks";
import {
  buildInviteDeepLink,
  buildInviteShareUrl,
  formatShareLinkLine,
} from "@/utils/deepLinks";

export function buildDonationSupportShareMessage(): string {
  const deepLink = buildInviteDeepLink();
  const publicUrl = buildInviteShareUrl();
  const linkLine = formatShareLinkLine(deepLink, publicUrl);

  return appendStoreLinks(
    i18n.t("donation.thankYou.shareMessage", {
      brand: i18n.t("share.brand"),
      link: linkLine,
    })
  );
}

export async function shareDonationSupport(): Promise<void> {
  await Share.share({
    message: buildDonationSupportShareMessage(),
    title: i18n.t("donation.thankYou.shareDialogTitle"),
  });
}

export function donationThankYouTierKey(tier: DonorTierId): `donation.thankYou.${DonorTierId}` {
  return `donation.thankYou.${tier}`;
}

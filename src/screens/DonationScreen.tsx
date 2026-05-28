import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarInset } from "@/hooks/useTabBarInset";
import { useTranslation } from "react-i18next";
import { DonorTierBadge } from "@/components/donation/DonorTierBadge";
import { GlassCard } from "@/components/GlassCard";
import { DONATION_TIERS, type DonorTierId } from "@/data/donationTiers";
import { useDonationIap } from "@/hooks/useDonationIap";
import type { DonationIapMessageKey } from "@/services/donation/iapService";
import {
  donationThankYouTierKey,
  shareDonationSupport,
} from "@/services/share/shareDonation";
import { useDonorStore } from "@/store/donorStore";
import { colors, radii, spacing, typography } from "@/theme";

type DonationStep = "select" | "thanks";

export default function DonationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentContainerStyle: scrollBottomInset } = useTabBarInset();
  const donorTier = useDonorStore((s) => s.donorTier);

  const [step, setStep] = useState<DonationStep>("select");
  const [awardedTier, setAwardedTier] = useState(donorTier);

  const onPurchaseSuccess = useCallback((tierId: DonorTierId) => {
    setAwardedTier(tierId);
    setStep("thanks");
  }, []);

  const {
    iapAvailable,
    errorKey,
    activeTierId,
    purchaseTier,
    getDisplayPrice,
    clearError,
    isBusy,
  } = useDonationIap({ onPurchaseSuccess });

  const shareSupport = useCallback(async () => {
    try {
      await shareDonationSupport();
    } catch {
      // share sheet dismissed
    }
  }, []);

  const thanksTierMessage = useMemo(() => {
    if (!awardedTier) {
      return t("donation.thankYou.body");
    }
    return t(donationThankYouTierKey(awardedTier));
  }, [awardedTier, t]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        scrollBottomInset,
        { paddingTop: insets.top + spacing.sm },
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.accent} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{t("donation.title")}</Text>
          <Text style={styles.subtitle}>{t("donation.subtitle")}</Text>
        </View>
      </View>

      {step === "select" ? (
        <>
          {!iapAvailable ? (
            <GlassCard style={styles.noticeCard}>
              <Ionicons name="storefront-outline" size={22} color={colors.accent} />
              <Text style={styles.noticeText}>{t("donation.iap.playRequired")}</Text>
            </GlassCard>
          ) : null}

          {errorKey ? (
            <GlassCard style={styles.errorCard}>
              <Text style={styles.errorText}>{t(errorKey as DonationIapMessageKey)}</Text>
              <Pressable onPress={clearError} hitSlop={8}>
                <Text style={styles.errorDismiss}>{t("common.dismiss")}</Text>
              </Pressable>
            </GlassCard>
          ) : null}

          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>{t("donation.chooseAmount")}</Text>
            <Text style={styles.hint}>{t("donation.chooseAmountHint")}</Text>
            <Text style={styles.meta}>{t("donation.iap.playBillingHint")}</Text>
            <View style={styles.amountGrid}>
              {DONATION_TIERS.map((tier) => {
                const purchasing = activeTierId === tier.id && isBusy;
                const fallbackAmount = t("donation.amountPln", { amount: tier.amountPln });
                const displayPrice = getDisplayPrice(tier.id, fallbackAmount);
                return (
                  <Pressable
                    key={tier.id}
                    onPress={() => {
                      if (isBusy || !iapAvailable) {
                        return;
                      }
                      void purchaseTier(tier.id);
                    }}
                    style={[
                      styles.amountButton,
                      {
                        borderColor: tier.badgeBorder,
                        backgroundColor: tier.badgeGlow,
                      },
                      (isBusy && !purchasing) || !iapAvailable ? styles.amountButtonDisabled : null,
                    ]}
                    disabled={(isBusy && !purchasing) || !iapAvailable}
                    accessibilityRole="button"
                    accessibilityLabel={t("donation.iap.tierCta", {
                      tier: t(`donorTier.${tier.id}`),
                      amount: displayPrice,
                    })}
                  >
                    {purchasing ? (
                      <ActivityIndicator color={tier.badgeColor} />
                    ) : (
                      <>
                        <Text style={[styles.amountValue, { color: tier.badgeColor }]}>
                          {displayPrice}
                        </Text>
                        <DonorTierBadge tierId={tier.id} compact />
                        <Text style={styles.tierCta}>{t("donation.donateNow")}</Text>
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>{t("donation.whyDonate.title")}</Text>
            <Text style={styles.previewText}>{t("donation.whyDonate.lead")}</Text>
            <Text style={styles.body}>{t("donation.whyDonate.body")}</Text>
          </GlassCard>
        </>
      ) : null}

      {step === "thanks" ? (
        <GlassCard style={[styles.card, styles.thanksCard]}>
          <View style={styles.thanksIconWrap}>
            <Ionicons name="heart" size={28} color={colors.accent} />
          </View>
          <Text style={styles.thanksTitle}>{t("donation.thankYou.title")}</Text>
          <Text style={styles.thanksBody}>{thanksTierMessage}</Text>
          <Text style={styles.thanksClosing}>{t("donation.thankYou.body")}</Text>
          {awardedTier ? (
            <View style={styles.thanksBadgeWrap}>
              <Text style={styles.meta}>{t("donation.thankYou.yourRank")}</Text>
              <DonorTierBadge tierId={awardedTier} />
            </View>
          ) : null}
          <View style={styles.thanksActions}>
            <Pressable
              onPress={() => void shareSupport()}
              style={styles.shareSupportBtn}
              accessibilityRole="button"
              accessibilityLabel={t("donation.thankYou.shareCta")}
            >
              <Ionicons name="share-social-outline" size={18} color={colors.accent} />
              <Text style={styles.shareSupportText}>{t("donation.thankYou.shareCta")}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.back()}
              style={[styles.primaryCta, styles.thanksDoneCta]}
              accessibilityRole="button"
            >
              <Text style={styles.primaryCtaText}>{t("donation.thankYou.done")}</Text>
            </Pressable>
          </View>
        </GlassCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  backBtn: {
    padding: spacing.xs,
    marginTop: 2,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.hero,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  noticeCard: {
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderColor: "rgba(184,137,46,0.35)",
    backgroundColor: "rgba(184,137,46,0.08)",
  },
  noticeText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  errorCard: {
    padding: spacing.md,
    gap: spacing.sm,
    borderColor: colors.danger,
    backgroundColor: "rgba(220,80,80,0.08)",
  },
  errorText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  errorDismiss: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "600",
  },
  card: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.accent,
    fontWeight: "700",
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  amountGrid: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  amountButton: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
  },
  amountButtonDisabled: {
    opacity: 0.55,
  },
  amountValue: {
    ...typography.subtitle,
    fontWeight: "700",
  },
  tierCta: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  previewText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  primaryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  primaryCtaText: {
    ...typography.body,
    color: colors.canvas,
    fontWeight: "700",
  },
  thanksCard: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  thanksIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(184,137,46,0.45)",
    backgroundColor: "rgba(184,137,46,0.12)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.xs,
  },
  thanksTitle: {
    ...typography.hero,
    color: colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
  },
  thanksBody: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
    textAlign: "center",
  },
  thanksClosing: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 20,
    textAlign: "center",
  },
  thanksBadgeWrap: {
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    alignSelf: "stretch",
  },
  thanksActions: {
    gap: spacing.sm,
    marginTop: spacing.md,
    alignSelf: "stretch",
  },
  shareSupportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundElevated,
  },
  shareSupportText: {
    ...typography.body,
    color: colors.accent,
    fontWeight: "600",
  },
  thanksDoneCta: {
    alignSelf: "stretch",
  },
});

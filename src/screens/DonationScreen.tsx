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
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { DonorTierBadge } from "@/components/donation/DonorTierBadge";
import { GlassCard } from "@/components/GlassCard";
import { DONATION_TIERS, type DonationTier } from "@/data/donationTiers";
import {
  donationThankYouTierKey,
  shareDonationSupport,
} from "@/services/share/shareDonation";
import { useDonorStore } from "@/store/donorStore";
import { colors, radii, spacing, typography } from "@/theme";

type DonationStep = "select" | "confirm" | "thanks";

function buildDonationUrl(baseUrl: string, amountPln: number): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("amount", String(amountPln));
    return url.toString();
  } catch {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}amount=${amountPln}`;
  }
}

export default function DonationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const recordDonation = useDonorStore((s) => s.recordDonation);
  const donorTier = useDonorStore((s) => s.donorTier);

  const [selectedTier, setSelectedTier] = useState<DonationTier>(DONATION_TIERS[0]);
  const [step, setStep] = useState<DonationStep>("select");
  const [busy, setBusy] = useState(false);
  const [awardedTier, setAwardedTier] = useState(donorTier);

  const donationUrl = process.env.EXPO_PUBLIC_DONATION_URL?.trim() ?? "";

  const formattedAmount = useMemo(
    () => t("donation.amountPln", { amount: selectedTier.amountPln }),
    [selectedTier.amountPln, t]
  );

  const openPayment = useCallback(async () => {
    if (!donationUrl) {
      setStep("confirm");
      return;
    }

    setBusy(true);
    try {
      await WebBrowser.openBrowserAsync(buildDonationUrl(donationUrl, selectedTier.amountPln), {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        controlsColor: colors.accent,
      });
      setStep("confirm");
    } finally {
      setBusy(false);
    }
  }, [donationUrl, selectedTier.amountPln]);

  const confirmPayment = useCallback(async () => {
    setBusy(true);
    try {
      const tier = await recordDonation(selectedTier.amountPln);
      setAwardedTier(tier);
      setStep("thanks");
    } finally {
      setBusy(false);
    }
  }, [recordDonation, selectedTier.amountPln]);

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
        { paddingBottom: insets.bottom + spacing.xxl, paddingTop: insets.top + spacing.sm },
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
          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>{t("donation.chooseAmount")}</Text>
            <Text style={styles.hint}>{t("donation.chooseAmountHint")}</Text>
            <View style={styles.amountGrid}>
              {DONATION_TIERS.map((tier) => {
                const active = selectedTier.id === tier.id;
                return (
                  <Pressable
                    key={tier.id}
                    onPress={() => setSelectedTier(tier)}
                    style={[
                      styles.amountButton,
                      active && {
                        borderColor: tier.badgeBorder,
                        backgroundColor: tier.badgeGlow,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.amountValue, active && { color: tier.badgeColor }]}>
                      {t("donation.amountPln", { amount: tier.amountPln })}
                    </Text>
                    <DonorTierBadge tierId={tier.id} compact />
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>{t("donation.whyDonate.title")}</Text>
            <Text style={styles.previewText}>{t("donation.whyDonate.lead")}</Text>
            <Text style={styles.body}>{t("donation.whyDonate.body")}</Text>
            <Text style={styles.meta}>{t("donation.secureRedirect")}</Text>
          </GlassCard>

          <Pressable
            onPress={() => void openPayment()}
            style={[styles.primaryCta, busy && styles.primaryCtaDisabled]}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t("donation.donateNow")}
          >
            {busy ? (
              <ActivityIndicator color={colors.canvas} />
            ) : (
              <>
                <Ionicons name="gift-outline" size={18} color={colors.canvas} />
                <Text style={styles.primaryCtaText}>
                  {t("donation.donateNow")} · {formattedAmount}
                </Text>
              </>
            )}
          </Pressable>
        </>
      ) : null}

      {step === "confirm" ? (
        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>{t("donation.confirmTitle")}</Text>
          <Text style={styles.body}>{t("donation.confirmBody", { amount: formattedAmount })}</Text>
          <View style={styles.confirmActions}>
            <Pressable
              onPress={() => setStep("select")}
              style={styles.secondaryBtn}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryBtnText}>{t("common.back")}</Text>
            </Pressable>
            <Pressable
              onPress={() => void confirmPayment()}
              style={[styles.primaryCta, styles.confirmCta, busy && styles.primaryCtaDisabled]}
              disabled={busy}
              accessibilityRole="button"
            >
              {busy ? (
                <ActivityIndicator color={colors.canvas} />
              ) : (
                <Text style={styles.primaryCtaText}>{t("donation.confirmPaid")}</Text>
              )}
            </Pressable>
          </View>
        </GlassCard>
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
    borderColor: colors.glassBorder,
    borderRadius: radii.lg,
    backgroundColor: colors.backgroundElevated,
    padding: spacing.md,
    gap: spacing.sm,
  },
  amountValue: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
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
  primaryCtaDisabled: {
    opacity: 0.7,
  },
  primaryCtaText: {
    ...typography.body,
    color: colors.canvas,
    fontWeight: "700",
  },
  confirmActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundElevated,
  },
  secondaryBtnText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  confirmCta: {
    flex: 1.4,
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

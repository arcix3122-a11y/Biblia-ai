import React, { useState, useRef, useEffect } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Linking,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { TranslationKey } from "@/i18n/types";
import { colors, radii, spacing, typography } from "@/theme";
import { GlassCard } from "@/components/GlassCard";
import * as Haptics from "expo-haptics";

interface EcosystemModalProps {
  visible: boolean;
  onClose: () => void;
}

interface EcosystemApp {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  buttonColor: string;
  badgeTextKey: TranslationKey;
  descKey: TranslationKey;
  isActive: boolean;
  url: string;
}

const ECOSYSTEM_APPS: EcosystemApp[] = [
  {
    id: "biblia-ai",
    name: "Biblia AI",
    icon: "book",
    iconColor: colors.accent,
    buttonColor: colors.accent,
    badgeTextKey: "ecosystem.activeApp",
    descKey: "ecosystem.bibliaDesc",
    isActive: true,
    url: "https://play.google.com/store/apps/developer?id=SolidCode+Apps&utm_source=emea_Med",
  },
  {
    id: "kaucja-mapa",
    name: "KaucjaMapa",
    icon: "leaf",
    iconColor: "#10b981",
    buttonColor: "#10b981",
    badgeTextKey: "ecosystem.install",
    descKey: "ecosystem.kaucjaDesc",
    isActive: false,
    url: "https://play.google.com/store/apps/developer?id=SolidCode+Apps&utm_source=emea_Med",
  },
  {
    id: "prawo-jazdy",
    name: "Prawo Jazdy 180 AI",
    icon: "car",
    iconColor: "#3b82f6",
    buttonColor: "#2563eb",
    badgeTextKey: "ecosystem.install",
    descKey: "ecosystem.prawoJazdyDesc",
    isActive: false,
    url: "https://play.google.com/store/apps/developer?id=SolidCode+Apps&utm_source=emea_Med",
  },
  {
    id: "smart-najem",
    name: "SmartNajem",
    icon: "home",
    iconColor: "#a855f7",
    buttonColor: "#7c3aed",
    badgeTextKey: "ecosystem.install",
    descKey: "ecosystem.smartNajemDesc",
    isActive: false,
    url: "https://play.google.com/store/apps/developer?id=SolidCode+Apps&utm_source=emea_Med",
  },
];

export function EcosystemModal({ visible, onClose }: EcosystemModalProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<"quote" | "apps">("quote");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(0.9)).current;
  const quoteScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      setPhase("quote");
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
      buttonScale.setValue(0.9);
      quoteScale.setValue(0.95);

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(quoteScale, {
          toValue: 1,
          friction: 5,
          tension: 30,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleContinue = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1.05,
        friction: 3,
        tension: 150,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setPhase("apps");
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 7,
          tension: 45,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleOpenStore = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (err) {
      console.warn("Failed to open link:", err);
    }
  };

  const handleOpenDeveloperProfile = () => {
    void handleOpenStore(
      "https://play.google.com/store/apps/developer?id=SolidCode+Apps&utm_source=emea_Med"
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.bottomSheet}>
          {phase === "quote" ? (
            /* Phase 1: Holy & Premium Quote Transition Phase */
            <Animated.View
              style={[
                quoteStyles.quoteContainer,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideAnim },
                    { scale: quoteScale },
                  ],
                },
              ]}
            >
              {/* Top row with just close button */}
              <View style={quoteStyles.quoteHeaderRow}>
                <Pressable onPress={onClose} style={styles.closeIcon} hitSlop={15}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={quoteStyles.quoteContent}>
                {/* Gold glowing monastery/bible icon */}
                <View style={quoteStyles.quoteIconGlowContainer}>
                  <Ionicons name="book" size={32} color={colors.accent} />
                </View>

                {/* Subtitle intro */}
                <Text style={quoteStyles.quoteAuthor}>{t("ecosystem.quoteIntro" as any)}</Text>

                {/* Dominicans Father quote */}
                <Text style={quoteStyles.quoteText}>{t("ecosystem.quoteText" as any)}</Text>

                {/* Decorative horizontal gold divider */}
                <View style={quoteStyles.quoteDivider} />

                {/* Explanation of AI Bible */}
                <Text style={quoteStyles.quoteExplanation}>
                  {t("ecosystem.quoteExplanation" as any)}
                </Text>
              </View>

              {/* Premium Green spring-animated CTA Button */}
              <Animated.View style={[quoteStyles.premiumCTAWrapper, { transform: [{ scale: buttonScale }] }]}>
                <Pressable
                  onPress={handleContinue}
                  style={quoteStyles.premiumCTAButton}
                >
                  <Text style={quoteStyles.premiumCTAButtonText}>
                    {t("ecosystem.continueCTA" as any)}
                  </Text>
                </Pressable>
              </Animated.View>
            </Animated.View>
          ) : (
            /* Phase 2: Apps Screen */
            <Animated.View
              style={[
                quoteStyles.appsContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.appStudioTitle}>APP FACTORY STUDIO</Text>
                  <Text style={styles.title}>{t("ecosystem.welcomeTitle")}</Text>
                </View>
                <Pressable onPress={onClose} style={styles.closeIcon} hitSlop={15}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              {/* Subheading intro */}
              <Text style={styles.introText}>{t("ecosystem.intro")}</Text>

              {/* Scrollable list of apps */}
              <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                {ECOSYSTEM_APPS.map((app) => (
                  <GlassCard key={app.id} style={styles.appCard}>
                    <View style={styles.appHeaderRow}>
                      <View style={[styles.iconContainer, { backgroundColor: `${app.iconColor}15` }]}>
                        <Ionicons name={app.icon} size={22} color={app.iconColor} />
                      </View>
                      <View style={styles.appTitleColumn}>
                        <Text style={styles.appName}>{app.name}</Text>
                        {app.isActive ? (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>{t(app.badgeTextKey as any)}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    <Text style={styles.appDesc}>{t(app.descKey as any)}</Text>

                    {!app.isActive ? (
                      <Pressable
                        onPress={() => void handleOpenStore(app.url)}
                        style={[styles.storeButton, { backgroundColor: app.buttonColor }]}
                      >
                        <Text style={styles.storeButtonText}>{t("ecosystem.viewInStore")}</Text>
                        <Ionicons name="arrow-forward" size={14} color={colors.canvas} />
                      </Pressable>
                    ) : (
                      <View style={styles.installedIndicator}>
                        <Ionicons name="checkmark-circle-outline" size={14} color="#10b981" />
                        <Text style={styles.installedIndicatorText}>{t("ecosystem.installed")}</Text>
                      </View>
                    )}
                  </GlassCard>
                ))}
              </ScrollView>

              {/* Footer controls */}
              <View style={styles.footer}>
                <Pressable onPress={handleOpenDeveloperProfile} style={styles.devProfileBtn}>
                  <Text style={styles.devProfileBtnText}>{t("ecosystem.seeAllApps")}</Text>
                </Pressable>
                <Pressable onPress={onClose} style={styles.primaryCloseBtn}>
                  <Text style={styles.primaryCloseBtnText}>{t("common.close")}</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    height: "85%",
    backgroundColor: "#0A101D",
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  headerTextContainer: {
    flex: 1,
  },
  appStudioTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#10b981",
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: 20,
  },
  closeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  introText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  appCard: {
    padding: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  appHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  appTitleColumn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  activeBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#10b981",
  },
  appDesc: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  storeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
  },
  storeButtonText: {
    ...typography.caption,
    color: colors.canvas,
    fontWeight: "700",
  },
  installedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  installedIndicatorText: {
    ...typography.caption,
    color: "#10b981",
    fontWeight: "600",
  },
  footer: {
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorder,
    gap: spacing.sm,
  },
  devProfileBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
  },
  devProfileBtnText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  primaryCloseBtn: {
    backgroundColor: "#10b981",
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCloseBtnText: {
    ...typography.body,
    color: colors.canvas,
    fontWeight: "800",
  },
});

const quoteStyles = StyleSheet.create({
  quoteContainer: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: spacing.lg,
  },
  quoteHeaderRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "100%",
  },
  quoteContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  quoteIconGlowContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(234, 179, 8, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.3)",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  quoteAuthor: {
    ...typography.caption,
    color: "#10b981",
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: spacing.md,
    textAlign: "center",
  },
  quoteText: {
    ...typography.subtitle,
    fontSize: 20,
    fontStyle: "italic",
    color: "#fef08a",
    textAlign: "center",
    lineHeight: 30,
    fontWeight: "700",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  quoteDivider: {
    width: 60,
    height: 2,
    backgroundColor: colors.accent,
    marginVertical: spacing.md,
    opacity: 0.5,
  },
  quoteExplanation: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  premiumCTAWrapper: {
    width: "100%",
  },
  premiumCTAButton: {
    backgroundColor: "#10b981",
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  premiumCTAButtonText: {
    ...typography.body,
    color: colors.canvas,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  appsContainer: {
    flex: 1,
  },
});

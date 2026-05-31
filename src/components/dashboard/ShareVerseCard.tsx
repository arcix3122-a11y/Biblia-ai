import React, { forwardRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { STORY_HEIGHT, STORY_WIDTH } from "@/services/share/verseImageExporter";
import { colors, spacing, typography } from "@/theme";
import type { ShareVerseCardProps } from "@/types/ui";

export const ShareVerseCard = forwardRef<View, ShareVerseCardProps>(function ShareVerseCard(
  { reference, text, width = STORY_WIDTH, height = STORY_HEIGHT },
  ref
) {
  const { t } = useTranslation();

  return (
    <View
      ref={ref}
      collapsable={false}
      style={[styles.card, { width, height }]}
    >
      {/* Exquisite Double Golden Border Frame */}
      <View style={styles.innerFrame}>
        {/* Subtle Watermarked Background Cross */}
        <View style={styles.crossContainer} pointerEvents="none">
          <Text style={styles.backgroundCross}>✟</Text>
        </View>

        {/* Golden Corner Ornaments */}
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.quoteMark}>“</Text>
          <Text style={styles.text}>{text}</Text>
          <Text style={styles.reference}>— {reference}</Text>
        </View>

        {/* Muted Monastic Branding */}
        <Text style={styles.brand}>SolidCode · {t("common.appName")}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#050505", // Extra deep obsidian black for high contrast
    padding: 32, // Padding for the outer gold frame
    justifyContent: "center",
  },
  innerFrame: {
    flex: 1,
    borderWidth: 2,
    borderColor: "rgba(229, 169, 60, 0.45)", // Semi-transparent golden inner line
    paddingHorizontal: spacing.xl * 2,
    paddingVertical: spacing.xxl * 2,
    justifyContent: "center",
    position: "relative",
    borderRadius: 8,
  },
  crossContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 0,
  },
  backgroundCross: {
    fontSize: 780, // Massive centered cross
    color: colors.accent,
    opacity: 0.038, // Extremely subtle watermarked glow
    textAlign: "center",
  },
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: "rgba(229, 169, 60, 0.85)", // Stronger gold for corners
    zIndex: 2,
  },
  topLeft: {
    top: 16,
    left: 16,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 16,
    right: 16,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 16,
    left: 16,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 16,
    right: 16,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  content: {
    zIndex: 1,
    position: "relative",
  },
  quoteMark: {
    fontSize: 120,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    color: "rgba(229, 169, 60, 0.25)",
    position: "absolute",
    top: -90,
    left: -20,
  },
  text: {
    fontSize: 48,
    lineHeight: 68,
    letterSpacing: 0.4,
    color: "#F7F5F0", // Holy warm-white parchment color
    marginBottom: spacing.xl,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", // Classic serif font for scripture
    textAlign: "center",
  },
  reference: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.accent,
    textAlign: "center",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: spacing.sm,
  },
  brand: {
    ...typography.label,
    color: colors.textMuted,
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    opacity: 0.45,
    letterSpacing: 1.5,
  },
});

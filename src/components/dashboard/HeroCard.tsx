import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PhotoBackground } from "@/components/PhotoBackground";
import { colors, radii, spacing, typography } from "@/theme";

interface HeroCardProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  ctaLabel: string;
  photoUrl: string;
  progressPercent?: number;
  onPress: () => void;
}

export function HeroCard({
  eyebrow,
  title,
  subtitle,
  ctaLabel,
  photoUrl,
  progressPercent,
  onPress,
}: HeroCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${ctaLabel}`}
      style={({ pressed }) => [styles.wrapper, pressed && styles.wrapperPressed]}
    >
      <PhotoBackground
        uri={photoUrl}
        style={styles.card}
        borderRadius={radii.xl}
        scrimOpacity={0.58}
      >
        <View style={styles.content}>
          <View style={styles.topSection}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          {progressPercent !== undefined && progressPercent > 0 ? (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(100, progressPercent)}%` }]} />
              </View>
              <Text style={styles.progressText}>{progressPercent}%</Text>
            </View>
          ) : null}

          <View style={styles.ctaRow}>
            <Text style={styles.cta}>{ctaLabel}</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.textPrimary} />
          </View>
        </View>
      </PhotoBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radii.xl,
    overflow: "hidden",
  },
  wrapperPressed: {
    opacity: 0.94,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 180,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
    minHeight: 180,
    justifyContent: "space-between",
  },
  topSection: {
    gap: spacing.xs,
  },
  eyebrow: {
    ...typography.label,
    color: colors.accent,
  },
  title: {
    ...typography.hero,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif", default: undefined }),
  },
  subtitle: {
    ...typography.body,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 22,
  },
  progressContainer: {
    marginTop: spacing.xs,
    gap: 4,
  },
  progressBarBg: {
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
  },
  progressText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.18)",
  },
  cta: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
  },
});

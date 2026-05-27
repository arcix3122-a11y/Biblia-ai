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
  onPress: () => void;
}

export function HeroCard({
  eyebrow,
  title,
  subtitle,
  ctaLabel,
  photoUrl,
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
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
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
    minHeight: 176,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xs,
    minHeight: 176,
    justifyContent: "space-between",
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
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
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

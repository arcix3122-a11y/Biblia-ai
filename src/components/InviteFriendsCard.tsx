import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@/components/GlassCard";
import { shareInvite } from "@/services/share/shareInvite";
import { colors, radii, spacing, typography } from "@/theme";

interface InviteFriendsCardProps {
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export function InviteFriendsCard({ style, compact = false }: InviteFriendsCardProps) {
  const { t } = useTranslation();

  const handleInvite = useCallback(async () => {
    try {
      await shareInvite();
    } catch {
      // share sheet dismissed
    }
  }, []);

  return (
    <GlassCard style={[styles.card, compact && styles.cardCompact, style]}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="people-outline" size={22} color={colors.accent} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{t("share.inviteTitle")}</Text>
          <Text style={styles.body}>{t("share.inviteHint")}</Text>
        </View>
      </View>
      <Pressable
        onPress={() => void handleInvite()}
        style={styles.cta}
        accessibilityRole="button"
        accessibilityLabel={t("share.inviteCta")}
      >
        <Ionicons name="share-social-outline" size={18} color={colors.canvas} />
        <Text style={styles.ctaText}>{t("share.inviteCta")}</Text>
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  cardCompact: {
    paddingVertical: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  body: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  ctaText: {
    ...typography.caption,
    color: colors.canvas,
    fontWeight: "700",
  },
});

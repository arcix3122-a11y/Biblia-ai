import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { GlassCard } from "@/components/GlassCard";
import { colors, radii, spacing, typography } from "@/theme";

export function SupportCard() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push("/donate")}
      accessibilityRole="button"
      accessibilityLabel={t("home.supportCard.cta")}
    >
      <GlassCard style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="heart" size={22} color={colors.accent} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{t("home.supportCard.title")}</Text>
            <Text style={styles.body}>{t("home.supportCard.body")}</Text>
          </View>
        </View>
        <View style={styles.ctaRow}>
          <Text style={styles.cta}>{t("home.supportCard.cta")}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.accent} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm,
    borderColor: "rgba(184,137,46,0.45)",
    backgroundColor: "rgba(184,137,46,0.08)",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(184,137,46,0.45)",
    backgroundColor: "rgba(184,137,46,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.subtitle,
    color: colors.accent,
    fontWeight: "700",
  },
  body: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(184,137,46,0.25)",
  },
  cta: {
    ...typography.body,
    color: colors.accent,
    fontWeight: "700",
  },
});

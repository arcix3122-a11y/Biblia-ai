import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActionTile } from "@/components/dashboard/ActionTile";
import { GlassCard } from "@/components/GlassCard";
import { PRACTICES } from "@/data/practices";
import { getCategoryPhotoUrl } from "@/data/photoBackgrounds";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import { colors, spacing, typography } from "@/theme";

const PRACTICE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  fasting: "flame-outline",
  stations: "walk-outline",
  rosary: "radio-button-on-outline",
};

export default function DevotionalHubScreen() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.accent} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t("practices.hubTitle")}</Text>
          <Text style={styles.subtitle}>{t("practices.hubSubtitle")}</Text>
        </View>
      </View>

      <GlassCard style={styles.introCard}>
        <Text style={styles.introTitle}>{t("practices.hubIntroTitle")}</Text>
        <Text style={styles.introBody}>{t("practices.hubIntroBody")}</Text>
      </GlassCard>

      {PRACTICES.map((practice) => (
        <ActionTile
          key={practice.id}
          icon={PRACTICE_ICONS[practice.id] ?? "heart-outline"}
          title={t(practice.titleKey)}
          subtitle={t(practice.subtitleKey)}
          badge={t("common.new")}
          layout="horizontal"
          imageUrl={getCategoryPhotoUrl(practice.imageCategory, 600, 400)}
          onPress={() => router.push({ pathname: "/practice/[id]", params: { id: practice.id } })}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.md, gap: spacing.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: { padding: spacing.xs },
  headerText: { flex: 1 },
  title: { ...typography.title, color: colors.accent, fontWeight: "800" },
  subtitle: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  introCard: { padding: spacing.md, gap: spacing.xs },
  introTitle: { ...typography.subtitle, color: colors.textPrimary, fontWeight: "700" },
  introBody: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
});
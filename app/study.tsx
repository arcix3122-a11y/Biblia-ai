import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelectionStore } from "@/store/selectionStore";
import { useVerseStudy, VerseTranslation, InterlinearWord } from "@/hooks/useVerseStudy";
import { GlassCard } from "@/components/GlassCard";
import { colors, radii, spacing, typography } from "@/theme";

type StudyTab = "translations" | "original" | "commentary";

export default function StudyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const selectedVerse = useSelectionStore((s) => s.selectedVerse);

  const [activeTab, setActiveTab] = useState<StudyTab>("translations");
  const { details, loading, error, fetchStudyDetails } = useVerseStudy();

  useEffect(() => {
    if (selectedVerse) {
      void fetchStudyDetails(selectedVerse);
    }
  }, [selectedVerse, fetchStudyDetails]);

  if (!selectedVerse) {
    return (
      <View style={styles.centered}>
        <Ionicons name="book-outline" size={48} color={colors.textMuted} />
        <Text style={styles.errorText}>No verse selected for study.</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loaderText}>
            {t("study.loading") || "Engaging theological archives..."}
          </Text>
        </View>
      );
    }

    if (!details) {
      return null;
    }

    switch (activeTab) {
      case "translations":
        return (
          <ScrollView contentContainerStyle={styles.tabScrollContent}>
            <View style={styles.verseSourceCard}>
              <Text style={styles.sourceLabel}>
                {selectedVerse.bookName} {selectedVerse.chapter}:{selectedVerse.verse} (KJV)
              </Text>
              <Text style={styles.sourceText}>{selectedVerse.text}</Text>
            </View>
            <View style={styles.translationsList}>
              {details.translations.map((item, idx) => (
                <GlassCard key={idx} style={styles.translationCard}>
                  <View style={styles.translationHeader}>
                    <Text style={styles.translationName}>{item.name}</Text>
                    <View style={styles.langBadge}>
                      <Text style={styles.langBadgeText}>{item.lang.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.translationText}>{item.text}</Text>
                </GlassCard>
              ))}
            </View>
          </ScrollView>
        );

      case "original":
        return (
          <ScrollView contentContainerStyle={styles.tabScrollContent}>
            <View style={styles.interlinearList}>
              {details.interlinear.map((word, idx) => (
                <GlassCard key={idx} style={styles.interlinearCard}>
                  <View style={styles.wordRow}>
                    <Text style={styles.originalWord}>{word.original}</Text>
                    <Text style={styles.strongCode}>
                      {word.strong ? `${word.strong}` : ""}
                    </Text>
                  </View>
                  <View style={styles.wordDetailRow}>
                    <Text style={styles.transliterationText}>
                      <Text style={styles.label}>{t("study.transliteration") || "Translit"}:</Text>{" "}
                      {word.transliteration}
                    </Text>
                    <Text style={styles.meaningText}>
                      <Text style={styles.label}>{t("study.meaning") || "Meaning"}:</Text>{" "}
                      {word.translation}
                    </Text>
                  </View>
                </GlassCard>
              ))}
            </View>
          </ScrollView>
        );

      case "commentary":
        return (
          <ScrollView contentContainerStyle={styles.tabScrollContent}>
            <View style={styles.commentaryList}>
              {details.commentary.map((point, idx) => (
                <GlassCard key={idx} style={styles.commentaryCard}>
                  <View style={styles.bulletHeader}>
                    <Ionicons name="sparkles" size={16} color={colors.accent} />
                    <Text style={styles.bulletTitle}>Insight {idx + 1}</Text>
                  </View>
                  <Text style={styles.commentaryText}>{point}</Text>
                </GlassCard>
              ))}
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Modern Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={15}>
          <Ionicons name="close" size={24} color={colors.accent} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t("study.title") || "Scripture Study"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Target Scripture Header card */}
      <View style={styles.referenceBanner}>
        <Ionicons name="book" size={16} color={colors.accent} style={{ marginRight: 6 }} />
        <Text style={styles.referenceText}>
          {selectedVerse.bookName} {selectedVerse.chapter}:{selectedVerse.verse}
        </Text>
      </View>

      {/* Custom Tabs segment control */}
      <View style={styles.tabsContainer}>
        <Pressable
          onPress={() => setActiveTab("translations")}
          style={[styles.tab, activeTab === "translations" && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === "translations" && styles.tabTextActive]}>
            {t("study.translations") || "Translations"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("original")}
          style={[styles.tab, activeTab === "original" && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === "original" && styles.tabTextActive]}>
            {t("study.originalLanguage") || "Original"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("commentary")}
          style={[styles.tab, activeTab === "commentary" && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === "commentary" && styles.tabTextActive]}>
            {t("study.commentary") || "Commentary"}
          </Text>
        </Pressable>
      </View>

      {/* Error notification if any */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {/* Dynamic Tab Content rendering */}
      <View style={styles.content}>{renderTabContent()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.canvas,
    padding: spacing.xl,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  loaderText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  referenceBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundElevated,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  referenceText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
  },
  tabsContainer: {
    flexDirection: "row",
    padding: spacing.sm,
    backgroundColor: colors.canvas,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    alignItems: "center",
    borderRadius: radii.pill,
  },
  tabActive: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  tabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  tabTextActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  tabScrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  verseSourceCard: {
    padding: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing.xs,
  },
  sourceLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  sourceText: {
    ...typography.body,
    color: colors.textPrimary,
    fontStyle: "italic",
    lineHeight: 20,
  },
  translationsList: {
    gap: spacing.sm,
  },
  translationCard: {
    padding: spacing.md,
  },
  translationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  translationName: {
    ...typography.subtitle,
    color: colors.accent,
    fontWeight: "700",
  },
  langBadge: {
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  langBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.accent,
  },
  translationText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  interlinearList: {
    gap: spacing.sm,
  },
  interlinearCard: {
    padding: spacing.md,
  },
  wordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  originalWord: {
    fontSize: 22,
    color: colors.accent,
    fontWeight: "600",
  },
  strongCode: {
    ...typography.caption,
    color: colors.textMuted,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  wordDetailRow: {
    gap: spacing.xs,
  },
  transliterationText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  meaningText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  label: {
    color: colors.textMuted,
    fontWeight: "500",
  },
  commentaryList: {
    gap: spacing.sm,
  },
  commentaryCard: {
    padding: spacing.md,
  },
  bulletHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  bulletTitle: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  commentaryText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
  },
  backButtonText: {
    ...typography.subtitle,
    color: colors.canvas,
    fontWeight: "700",
  },
  errorBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.md,
  },
  errorBannerText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: "center",
  },
});

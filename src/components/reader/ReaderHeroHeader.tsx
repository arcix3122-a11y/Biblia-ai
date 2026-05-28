import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PhotoBackground } from "@/components/PhotoBackground";
import { getBookPhotoUrl } from "@/data/photoBackgrounds";
import { colors, radii, spacing, typography } from "@/theme";

export const READER_HERO_EXPANDED_HEIGHT = 200;
export const READER_HERO_COLLAPSE_SCROLL = 140;

export interface ReaderHeroHeaderProps {
  bookSlug: string;
  bookDisplayName: string;
  chapterNumber: number;
  flowSubtitle: string;
  translationLabel: string;
  collapsed?: boolean;
  showTranslationNotice?: boolean;
  translationNoticeText?: string;
  dismissTranslationNoticeA11y?: string;
  onDismissTranslationNotice?: () => void;
}

function ReaderHeroHeaderComponent({
  bookSlug,
  bookDisplayName,
  chapterNumber,
  flowSubtitle,
  translationLabel,
  collapsed = false,
  showTranslationNotice = false,
  translationNoticeText,
  dismissTranslationNoticeA11y,
  onDismissTranslationNotice,
}: ReaderHeroHeaderProps) {
  const photoUrl = getBookPhotoUrl(bookSlug, 900, collapsed ? 120 : 480);
  const title = `${bookDisplayName} ${chapterNumber}`;

  if (collapsed) {
    return (
      <View style={styles.collapsedShell}>
        <PhotoBackground
          uri={photoUrl}
          style={styles.collapsedPhoto}
          borderRadius={0}
          scrimOpacity={0.72}
        >
          <View style={styles.collapsedInner}>
            <Text style={styles.collapsedTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.collapsedTranslation} numberOfLines={1}>
              {translationLabel}
            </Text>
          </View>
        </PhotoBackground>
      </View>
    );
  }

  return (
    <View style={styles.expandedShell}>
      <PhotoBackground
        uri={photoUrl}
        style={styles.expandedPhoto}
        borderRadius={radii.lg}
        scrimOpacity={0.58}
      >
        <View style={styles.expandedInner}>
          <Text style={styles.expandedTitle}>{title}</Text>
          <Text style={styles.expandedSubtitle} numberOfLines={2}>
            {flowSubtitle}
          </Text>
          <Text style={styles.expandedTranslation} numberOfLines={1}>
            {translationLabel}
          </Text>
          {showTranslationNotice && translationNoticeText ? (
            <View style={styles.translationNotice}>
              <Text style={styles.translationNoticeText} numberOfLines={2}>
                {translationNoticeText}
              </Text>
              {onDismissTranslationNotice ? (
                <Pressable
                  onPress={onDismissTranslationNotice}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={dismissTranslationNoticeA11y}
                >
                  <Ionicons name="close" size={16} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </PhotoBackground>
      <View style={styles.flowDivider} />
    </View>
  );
}

export const ReaderHeroHeader = memo(ReaderHeroHeaderComponent);

const styles = StyleSheet.create({
  expandedShell: {
    marginBottom: spacing.md,
  },
  expandedPhoto: {
    minHeight: READER_HERO_EXPANDED_HEIGHT,
    width: "100%",
  },
  expandedInner: {
    flex: 1,
    minHeight: READER_HERO_EXPANDED_HEIGHT,
    justifyContent: "flex-end",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  expandedTitle: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 2,
  },
  expandedSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  expandedTranslation: {
    ...typography.caption,
    color: colors.accent,
    textAlign: "center",
    fontWeight: "600",
  },
  flowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.glassBorder,
    marginTop: spacing.sm,
  },
  collapsedShell: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  collapsedPhoto: {
    minHeight: 44,
    width: "100%",
  },
  collapsedInner: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  collapsedTitle: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "700",
    flex: 1,
  },
  collapsedTranslation: {
    ...typography.caption,
    color: colors.accent,
    fontSize: 11,
    maxWidth: "42%",
  },
  translationNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    width: "100%",
  },
  translationNoticeText: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
});

import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PhotoBackground } from "@/components/PhotoBackground";
import { colors, radii, spacing, typography } from "@/theme";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

export interface ActionTileProps {
  icon: IoniconsName;
  title: string;
  subtitle?: string;
  badge?: string;
  onPress: () => void;
  imageUrl?: string;
  /** "vertical" (square tile in 2-col grid) or "horizontal" (full-width with photo right) */
  layout?: "vertical" | "horizontal";
  accessibilityLabel?: string;
}

function ActionTileComponent({
  icon,
  title,
  subtitle,
  badge,
  onPress,
  imageUrl,
  layout = "vertical",
  accessibilityLabel,
}: ActionTileProps) {
  if (layout === "horizontal") {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.horizontal, pressed && styles.horizontalPressed]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
      >
        <View style={styles.horizontalContent}>
          {badge ? (
            <View style={styles.horizontalBadge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
          <View style={styles.horizontalIconRow}>
            <Ionicons name={icon} size={16} color={colors.accent} />
            <Text style={styles.horizontalEyebrow} numberOfLines={1}>
              {subtitle ?? ""}
            </Text>
          </View>
          <Text style={styles.horizontalTitle} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.horizontalCta}>
            <Ionicons name="play-circle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.horizontalCtaText}>{title}</Text>
          </View>
        </View>
        {imageUrl ? (
          <PhotoBackground
            uri={imageUrl}
            style={styles.horizontalImage}
            borderRadius={0}
            scrimOpacity={0.2}
          />
        ) : (
          <View style={styles.horizontalImageFallback}>
            <Ionicons name={icon} size={36} color={colors.accent} />
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {imageUrl ? (
        <PhotoBackground
          uri={imageUrl}
          style={StyleSheet.absoluteFill}
          borderRadius={radii.lg}
          scrimOpacity={0.55}
        />
      ) : (
        <View style={styles.tileImageFallback} />
      )}

      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}

      <View style={styles.tileContent}>
        <View style={styles.iconBubble}>
          <Ionicons name={icon} size={20} color={colors.accent} />
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export const ActionTile = memo(ActionTileComponent);

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 168,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
    overflow: "hidden",
  },
  tilePressed: {
    opacity: 0.92,
    borderColor: colors.accentMuted,
  },
  tileImageFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.cardHover,
  },
  tileContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: "space-between",
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: colors.accentMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    zIndex: 2,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.canvas,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  subtitle: {
    ...typography.caption,
    color: "rgba(255,255,255,0.78)",
    lineHeight: 16,
    marginTop: 2,
  },
  horizontal: {
    flexDirection: "row",
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: "hidden",
    minHeight: 116,
  },
  horizontalPressed: {
    opacity: 0.92,
    borderColor: colors.accentMuted,
  },
  horizontalContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: "center",
    gap: spacing.xs,
  },
  horizontalIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  horizontalEyebrow: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
    flexShrink: 1,
  },
  horizontalTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  horizontalCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  horizontalCtaText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  horizontalBadge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    zIndex: 2,
  },
  horizontalImage: {
    width: 116,
    height: "100%",
  },
  horizontalImageFallback: {
    width: 116,
    backgroundColor: colors.accentGlow,
    alignItems: "center",
    justifyContent: "center",
  },
});

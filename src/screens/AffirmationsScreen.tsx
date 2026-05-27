import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getCategoryPhotoUrl } from "@/data/photoBackgrounds";
import { PhotoBackground } from "@/components/PhotoBackground";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { useTranslation } from "react-i18next";
import {
  AFFIRMATIONS,
  AFFIRMATION_CATEGORIES,
  type AffirmationCategory,
  type AffirmationEntry,
} from "@/data/affirmations";
import { useLocaleStore } from "@/store/localeStore";
import { getDeviceLocale } from "@/i18n";
import { hapticLight, hapticSelection } from "@/utils/haptics";
import { colors, radii, spacing, typography } from "@/theme";

type CategoryFilter = AffirmationCategory | "all";

const CATEGORY_ICONS: Record<AffirmationCategory, React.ComponentProps<typeof Ionicons>["name"]> = {
  identity: "person-outline",
  peace: "leaf-outline",
  strength: "shield-checkmark-outline",
  faith: "star-outline",
  healing: "medkit-outline",
  hope: "sunny-outline",
  love: "heart-outline",
  gratitude: "happy-outline",
};

interface AffirmationCardProps {
  entry: AffirmationEntry;
  isActive: boolean;
  onPlay: (entry: AffirmationEntry) => void;
  onStop: () => void;
}

function AffirmationCard({ entry, isActive, onPlay, onStop }: AffirmationCardProps) {
  const { t: translate } = useTranslation();
  const t = translate as (key: string, options?: Record<string, unknown>) => string;
  const title = t(`${entry.i18nKey}.title`);
  const body = t(`${entry.i18nKey}.body`);
  const categoryLabel = t(`affirmations.categories.${entry.category}`);
  const Icon = CATEGORY_ICONS[entry.category];
  const photoUrl = getCategoryPhotoUrl(entry.category, 480, 480);

  return (
    <View style={[styles.card, isActive && styles.cardActive]}>
      <View style={styles.cardRow}>
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={styles.categoryBadge}>
              <Ionicons name={Icon} size={14} color={colors.accent} />
              <Text style={styles.categoryLabel}>{categoryLabel}</Text>
            </View>
            <Text style={styles.cardRef}>{entry.reference}</Text>
          </View>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardText} numberOfLines={4}>
            {body}
          </Text>
          <View style={styles.cardFooter}>
            <Text style={styles.durationLabel}>
              {t("affirmations.duration", { sec: entry.durationSec })}
            </Text>
            <Pressable
              onPress={() => (isActive ? onStop() : onPlay(entry))}
              style={({ pressed }) => [
                styles.playButton,
                isActive && styles.playButtonActive,
                pressed && styles.playButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={isActive ? t("affirmations.stop") : t("affirmations.listen")}
            >
              <Ionicons
                name={isActive ? "pause" : "play"}
                size={16}
                color={isActive ? colors.canvas : colors.accent}
              />
              <Text style={[styles.playLabel, isActive && styles.playLabelActive]}>
                {isActive ? t("affirmations.playing") : t("affirmations.listen")}
              </Text>
            </Pressable>
          </View>
        </View>

        <PhotoBackground
          uri={photoUrl}
          style={styles.cardPhoto}
          borderRadius={0}
          scrimOpacity={0.28}
        />
      </View>
    </View>
  );
}

export default function AffirmationsScreen() {
  const { t: translate } = useTranslation();
  const t = translate as (key: string, options?: Record<string, unknown>) => string;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale) ?? getDeviceLocale();
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const speakLangRef = useRef(locale === "pl" ? "pl-PL" : "en-US");

  useEffect(() => {
    speakLangRef.current = locale === "pl" ? "pl-PL" : "en-US";
  }, [locale]);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") {
      return AFFIRMATIONS;
    }
    return AFFIRMATIONS.filter((entry) => entry.category === filter);
  }, [filter]);

  const handlePlay = useCallback(
    (entry: AffirmationEntry) => {
      Speech.stop();
      const title = t(`${entry.i18nKey}.title`);
      const body = t(`${entry.i18nKey}.body`);
      setActiveId(entry.id);
      void hapticLight();
      Speech.speak(`${title}. ${body}`, {
        language: speakLangRef.current,
        rate: 0.92,
        pitch: 1.0,
        onDone: () => setActiveId(null),
        onStopped: () => setActiveId(null),
        onError: () => setActiveId(null),
      });
    },
    [t]
  );

  const handleStop = useCallback(() => {
    Speech.stop();
    setActiveId(null);
  }, []);

  const handleShuffle = useCallback(() => {
    if (filtered.length === 0) return;
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    handlePlay(pick);
  }, [filtered, handlePlay]);

  const handleSelectFilter = useCallback((next: CategoryFilter) => {
    void hapticSelection();
    setFilter(next);
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.iconButton}
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.tagline}>{t("affirmations.tagline")}</Text>
          <Text style={styles.title}>{t("affirmations.title")}</Text>
        </View>
        <Pressable
          onPress={handleShuffle}
          hitSlop={12}
          style={styles.iconButton}
          accessibilityLabel={t("affirmations.shuffle")}
        >
          <Ionicons name="shuffle" size={20} color={colors.accent} />
        </Pressable>
      </View>

      <Text style={styles.subtitle}>{t("affirmations.subtitle")}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        <Pressable
          onPress={() => handleSelectFilter("all")}
          style={[styles.filterChip, filter === "all" && styles.filterChipActive]}
          accessibilityRole="button"
        >
          <Text
            style={[styles.filterChipText, filter === "all" && styles.filterChipTextActive]}
          >
            {t("affirmations.filterAll")}
          </Text>
        </Pressable>
        {AFFIRMATION_CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => handleSelectFilter(cat)}
            style={[styles.filterChip, filter === cat && styles.filterChipActive]}
            accessibilityRole="button"
          >
            <Ionicons
              name={CATEGORY_ICONS[cat]}
              size={14}
              color={filter === cat ? colors.canvas : colors.accent}
              style={styles.filterIcon}
            />
            <Text
              style={[styles.filterChipText, filter === cat && styles.filterChipTextActive]}
            >
              {t(`affirmations.categories.${cat}`)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <Text style={styles.emptyHint}>{t("affirmations.emptyHint")}</Text>
        ) : (
          filtered.map((entry) => (
            <AffirmationCard
              key={entry.id}
              entry={entry}
              isActive={activeId === entry.id}
              onPlay={handlePlay}
              onStop={handleStop}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
  },
  tagline: {
    ...typography.label,
    color: colors.accent,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterRow: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.backgroundElevated,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterIcon: {
    marginRight: spacing.xs,
  },
  filterChipText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  filterChipTextActive: {
    color: colors.canvas,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  emptyHint: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  card: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: "hidden",
  },
  cardActive: {
    borderColor: colors.accent,
  },
  cardRow: {
    flexDirection: "row",
    minHeight: 168,
  },
  cardBody: {
    flex: 1,
    padding: spacing.md,
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.accentGlow,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accentMuted,
  },
  categoryLabel: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.4,
  },
  cardRef: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
  cardPhoto: {
    width: 120,
    minHeight: 168,
    borderTopRightRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
  },
  cardTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  cardText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorder,
  },
  durationLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.backgroundElevated,
  },
  playButtonActive: {
    backgroundColor: colors.accent,
  },
  playButtonPressed: {
    opacity: 0.9,
  },
  playLabel: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  playLabelActive: {
    color: colors.canvas,
  },
});

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AUDIO_ONBOARDING_SLIDES,
  type AudioOnboardingSlideConfig,
} from "@/data/audioOnboardingSlides";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import { hapticSelection, hapticSuccess } from "@/utils/haptics";
import { colors, radii, spacing, typography } from "@/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface AudioOnboardingProps {
  onComplete: () => void;
}

const SLIDE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  slide1: "book-outline",
  slide2: "language-outline",
  slide3: "cloud-offline-outline",
};

function resolveSlideCopy(
  slide: AudioOnboardingSlideConfig,
  t: ReturnType<typeof useAppTranslation>["t"]
): { title: string; body: string; iconName: React.ComponentProps<typeof Ionicons>["name"] } {
  if (slide.kind === "hero" && slide.heroKey) {
    return {
      title: t(`audioIntro.${slide.heroKey}.title`),
      body: t(`audioIntro.${slide.heroKey}.body`),
      iconName: SLIDE_ICONS[slide.heroKey] ?? "sparkles-outline",
    };
  }
  return {
    title: t("audioIntro.premium.title", { number: slide.id }),
    body: t("audioIntro.premium.body", { number: slide.id }),
    iconName: "sparkles-outline",
  };
}

function SlidePage({ slide }: { slide: AudioOnboardingSlideConfig }) {
  const { t } = useAppTranslation();
  const copy = useMemo(() => resolveSlideCopy(slide, t), [slide, t]);

  return (
    <View style={styles.slide}>
      <View style={styles.heroArea}>
        <View style={styles.iconBubble}>
          <Ionicons name={copy.iconName} size={56} color={colors.accent} />
        </View>
      </View>
      <View style={styles.copyArea}>
        <Text style={styles.slideTitle}>{copy.title}</Text>
        <Text style={styles.slideBody}>{copy.body}</Text>
      </View>
    </View>
  );
}

function DotPagination({ currentIndex, total }: { currentIndex: number; total: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={[styles.dot, index === currentIndex ? styles.dotActive : styles.dotInactive]}
        />
      ))}
    </View>
  );
}

export function AudioOnboarding({ onComplete }: AudioOnboardingProps) {
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<AudioOnboardingSlideConfig>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const isLastSlide = currentIndex >= AUDIO_ONBOARDING_SLIDES.length - 1;

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (nextIndex !== currentIndex) {
        setCurrentIndex(nextIndex);
        void hapticSelection();
      }
    },
    [currentIndex]
  );

  const goToIndex = useCallback((index: number) => {
    listRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  }, []);

  const handlePrimaryCta = useCallback(() => {
    if (isLastSlide) {
      void hapticSuccess();
      onComplete();
      return;
    }
    void hapticSelection();
    goToIndex(currentIndex + 1);
  }, [currentIndex, goToIndex, isLastSlide, onComplete]);

  const handleSkip = useCallback(() => {
    void hapticSelection();
    onComplete();
  }, [onComplete]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AudioOnboardingSlideConfig>) => <SlidePage slide={item} />,
    []
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topRow}>
        <Pressable
          onPress={handleSkip}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("common.skip")}
        >
          <Text style={styles.skip}>{t("common.skip")}</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={[...AUDIO_ONBOARDING_SLIDES]}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
      />

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm },
        ]}
      >
        <DotPagination currentIndex={currentIndex} total={AUDIO_ONBOARDING_SLIDES.length} />
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
          onPress={handlePrimaryCta}
        >
          <Text style={styles.ctaLabel}>
            {isLastSlide ? t("audioIntro.ctaStart") : t("audioIntro.ctaNext")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  skip: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  heroArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 220,
  },
  iconBubble: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  copyArea: {
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  slideTitle: {
    ...typography.hero,
    color: colors.textPrimary,
    textAlign: "center",
  },
  slideBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    minHeight: 12,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.accent,
  },
  dotInactive: {
    width: 6,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  ctaButton: {
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  ctaButtonPressed: {
    opacity: 0.9,
  },
  ctaLabel: {
    ...typography.subtitle,
    color: colors.canvas,
    fontWeight: "700",
  },
});

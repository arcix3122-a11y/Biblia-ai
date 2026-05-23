import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AUDIO_ONBOARDING_SLIDES,
  type AudioOnboardingSlideConfig,
} from "@/data/audioOnboardingSlides";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import { useOnboardingSlideAudio } from "@/hooks/useOnboardingSlideAudio";
import { hapticSelection, hapticSuccess } from "@/utils/haptics";
import { colors, radii, spacing, typography } from "@/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DOT_WINDOW = 9;

interface AudioOnboardingProps {
  onComplete: () => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function resolveSlideCopy(
  slide: AudioOnboardingSlideConfig,
  t: ReturnType<typeof useAppTranslation>["t"]
): { title: string; body: string; sampleText: string } {
  if (slide.kind === "hero" && slide.heroKey) {
    const title = t(`audioIntro.${slide.heroKey}.title`);
    const body = t(`audioIntro.${slide.heroKey}.body`);
    return { title, body, sampleText: `${title}. ${body}` };
  }

  const title = t("audioIntro.premium.title", { number: slide.id });
  const body = t("audioIntro.premium.body", { number: slide.id });
  return { title, body, sampleText: body };
}

interface SlidePageProps {
  slide: AudioOnboardingSlideConfig;
  isActive: boolean;
  locale: string;
  t: ReturnType<typeof useAppTranslation>["t"];
}

function SlidePage({ slide, isActive, locale, t }: SlidePageProps) {
  const copy = useMemo(() => resolveSlideCopy(slide, t), [slide, t]);
  const audio = useOnboardingSlideAudio(copy.sampleText, slide.estimatedDurationMs, locale);
  const { pause } = audio;

  React.useEffect(() => {
    if (!isActive) {
      void pause();
    }
  }, [isActive, pause]);

  return (
    <View style={styles.slide}>
      <ImageBackground source={slide.image} style={styles.background} resizeMode="cover">
        <View style={styles.scrimTop} />
        <View style={styles.scrimBottom} />
        <View style={styles.slideContent}>
          <Text style={styles.kicker}>
            {slide.kind === "hero"
              ? t("audioIntro.heroLabel")
              : t("audioIntro.premiumLabel", { number: slide.id })}
          </Text>
          <Text style={styles.slideTitle}>{copy.title}</Text>
          <Text style={styles.slideBody}>{copy.body}</Text>

          <View style={styles.playerCard}>
            <View style={styles.timelineRow}>
              <Text style={styles.timeLabel}>{formatTime(audio.positionMs)}</Text>
              <Slider
                style={styles.timeline}
                minimumValue={0}
                maximumValue={1}
                value={audio.progress}
                onSlidingComplete={(value) => {
                  void audio.seek(value * slide.estimatedDurationMs);
                }}
                minimumTrackTintColor={colors.accent}
                maximumTrackTintColor="rgba(255,255,255,0.18)"
                thumbTintColor={colors.accent}
              />
              <Text style={styles.timeLabel}>{formatTime(audio.durationMs)}</Text>
            </View>

            <View style={styles.controlsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("audioIntro.rewind")}
                style={styles.controlButton}
                onPress={() => void audio.skipBy(-15_000)}
              >
                <Text style={styles.controlLabel}>-15</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  audio.isPlaying ? t("audioIntro.pause") : t("audioIntro.play")
                }
                style={styles.playButton}
                onPress={() => {
                  void hapticSuccess();
                  void audio.togglePlayPause();
                }}
              >
                <Text style={styles.playIcon}>{audio.isPlaying ? "❚❚" : "▶"}</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("audioIntro.forward")}
                style={styles.controlButton}
                onPress={() => void audio.skipBy(15_000)}
              >
                <Text style={styles.controlLabel}>+15</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

function DotPagination({ currentIndex, total }: { currentIndex: number; total: number }) {
  const half = Math.floor(DOT_WINDOW / 2);
  const start = Math.max(0, Math.min(currentIndex - half, total - DOT_WINDOW));
  const end = Math.min(total, start + DOT_WINDOW);
  const dots = Array.from({ length: end - start }, (_, offset) => start + offset);

  return (
    <View style={styles.dotsRow}>
      {dots.map((index) => (
        <View
          key={index}
          style={[styles.dot, index === currentIndex ? styles.dotActive : styles.dotInactive]}
        />
      ))}
    </View>
  );
}

export function AudioOnboarding({ onComplete }: AudioOnboardingProps) {
  const { t, locale } = useAppTranslation();
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

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<AudioOnboardingSlideConfig>) => (
      <SlidePage slide={item} isActive={index === currentIndex} locale={locale} t={t} />
    ),
    [currentIndex, locale, t]
  );

  return (
    <View style={styles.root}>
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
        removeClippedSubviews
      />

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm },
        ]}
      >
        <Text style={styles.progressCaption}>
          {t("audioIntro.progress", {
            current: currentIndex + 1,
            total: AUDIO_ONBOARDING_SLIDES.length,
          })}
        </Text>
        <DotPagination currentIndex={currentIndex} total={AUDIO_ONBOARDING_SLIDES.length} />
        <Pressable
          accessibilityRole="button"
          style={styles.ctaButton}
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
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  background: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrimTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  scrimBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "62%",
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  slideContent: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingBottom: 168,
    gap: spacing.sm,
  },
  kicker: {
    ...typography.label,
    color: colors.accent,
  },
  slideTitle: {
    ...typography.hero,
    color: colors.textPrimary,
  },
  slideBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  playerCard: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    backgroundColor: "rgba(10,16,29,0.82)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  timeline: {
    flex: 1,
    height: 28,
  },
  timeLabel: {
    ...typography.caption,
    color: colors.textMuted,
    width: 42,
    textAlign: "center",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  controlButton: {
    minWidth: 52,
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  controlLabel: {
    ...typography.subtitle,
    color: colors.accent,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  playIcon: {
    ...typography.title,
    color: colors.accent,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.88)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorder,
    gap: spacing.sm,
  },
  progressCaption: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
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
  ctaLabel: {
    ...typography.subtitle,
    color: colors.canvas,
  },
});

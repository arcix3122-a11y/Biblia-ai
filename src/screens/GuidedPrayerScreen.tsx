import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ImageBackground,
  type ImageSourcePropType,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "@/theme";
import { GlassCard } from "@/components/GlassCard";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import { callLiveChatCompletion, hasLlmApiKey, type ChatCompletionMessage } from "@/services/ai/llmClient";
import { useNotesStore } from "@/store/notesStore";
import { useReminderStore } from "@/store/reminderStore";
import { useActiveTranslation } from "@/store/translationStore";
import { scheduleDailyReminder, requestNotificationPermission } from "@/services/notifications/reminderService";
import type { VerseWithReference } from "@/types/scripture";
import { formatBookReference } from "@/i18n/bookNames";

const PRAYER_AMBIENT_LOOP = require("../../assets/audio/prayer-ambient-loop.wav");

type PrayerVisual = {
  image: ImageSourcePropType;
  icon: React.ComponentProps<typeof Ionicons>["name"];
};

const PRAYER_STEP_VISUALS: PrayerVisual[] = [
  {
    image: require("../../assets/guided-prayer/welcome-chapel.png"),
    icon: "heart",
  },
  {
    image: require("../../assets/guided-prayer/adoration-scripture.png"),
    icon: "sparkles",
  },
  {
    image: require("../../assets/guided-prayer/reflection-window.png"),
    icon: "create-outline",
  },
  {
    image: require("../../assets/guided-prayer/habit-nightstand.png"),
    icon: "alarm-outline",
  },
];

export default function GuidedPrayerScreen() {
  const { t, i18n, locale } = useAppTranslation();
  const translation = useActiveTranslation(locale);
  const router = useRouter();

  // Step state: 0 = Welcome, 1 = Adoration, 2 = Reflection, 3 = Habit Loop
  const [step, setStep] = useState(0);

  // Loaded Context
  const [dailyVerse, setDailyVerse] = useState<VerseWithReference | null>(null);
  const [adorationText, setAdorationText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Reflection Step State
  const [reflectionText, setReflectionText] = useState("");
  const [isReflectionSaved, setIsReflectionSaved] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Habit Reminder Selection State
  const activeReminderEnabled = useReminderStore((s) => s.enabled);
  const reminderHour = useReminderStore((s) => s.hour);
  const reminderMinute = useReminderStore((s) => s.minute);
  const setReminderStoreEnabled = useReminderStore((s) => s.setEnabled);
  const setReminderStoreTime = useReminderStore((s) => s.setTime);

  // Animated Transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for Welcome (Breathing)
  const breathAnim = useRef(new Animated.Value(1)).current;
  const localeTag = locale === "pl" ? "pl-PL" : "en-US";
  const activeVisual = PRAYER_STEP_VISUALS[step] ?? PRAYER_STEP_VISUALS[0];

  // 1. Ambient Background Audio Loop Setup
  useEffect(() => {
    let soundInstance: Audio.Sound | null = null;
    let isMounted = true;

    async function initAudio() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          playThroughEarpieceAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          PRAYER_AMBIENT_LOOP,
          { shouldPlay: true, isLooping: true, volume: 0.16 }
        );
        soundInstance = sound;

        if (!isMounted) {
          await sound.stopAsync();
          await sound.unloadAsync();
        }
      } catch (err) {
        console.warn("Failed to initialize background ambient loop:", err);
      }
    }

    void initAudio();

    return () => {
      isMounted = false;
      if (soundInstance) {
        soundInstance.stopAsync().then(() => {
          soundInstance?.unloadAsync();
        }).catch((err) => {
          console.warn("Error unloading ambient sound:", err);
        });
      }
    };
  }, []);

  // 2. Load Scripture of the Day
  useEffect(() => {
    let isMounted = true;
    scriptureRepo.getVerseOfTheDay(translation)
      .then((verse) => {
        if (isMounted) {
          setDailyVerse(verse);
        }
      })
      .catch((err) => {
        console.error("Error loading scripture of the day:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [translation]);

  // 3. Generate Adoration Prayer via AI (or Fallback)
  useEffect(() => {
    const verse = dailyVerse;
    if (!verse) return;

    let isMounted = true;
    async function generateAdoration() {
      const activeVerse = dailyVerse;
      if (!activeVerse) return;

      setIsGenerating(true);
      const hasKey = hasLlmApiKey();
      const lang = i18n.language || locale;
      const languageName = t(lang.startsWith("pl") ? "guidedPrayer.aiLanguagePolish" : "guidedPrayer.aiLanguageEnglish");
      const systemPrompt = t("guidedPrayer.aiSystemPrompt", { language: languageName });

      const verseRef = formatBookReference(
        activeVerse.book_slug,
        activeVerse.chapter_number,
        activeVerse.number,
        locale,
        activeVerse.book_name
      );
      const userPrompt = t("guidedPrayer.aiUserPrompt", {
        reference: verseRef,
        text: activeVerse.text,
      });

      try {
        if (hasKey) {
          const messages: ChatCompletionMessage[] = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ];
          const response = await callLiveChatCompletion(messages);
          if (isMounted) {
            setAdorationText(response);
          }
        } else {
          throw new Error("No live LLM key, falling back.");
        }
      } catch (err) {
        // High-fidelity fallback based on localized language
        if (isMounted) {
          setAdorationText(t("guidedPrayer.aiFallbackAdoration", {
            reference: verseRef,
            text: activeVerse.text,
          }));
        }
      } finally {
        if (isMounted) {
          setIsGenerating(false);
        }
      }
    }

    void generateAdoration();
    return () => {
      isMounted = false;
    };
  }, [dailyVerse, i18n.language, locale, t]);

  // 4. Breath Animation Loop (Welcome step)
  useEffect(() => {
    if (step !== 0) return;

    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1.25,
          duration: 3500,
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 0.95,
          duration: 3500,
          useNativeDriver: true,
        }),
      ])
    );

    breathe.start();

    return () => breathe.stop();
  }, [step, breathAnim]);

  // 5. Handles exiting the session safely
  const handleExitPress = () => {
    Alert.alert(
      t("guidedPrayer.exitAlertTitle"),
      t("guidedPrayer.exitAlertMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("guidedPrayer.exitAlertConfirm"),
          style: "destructive",
          onPress: () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.back();
          },
        },
      ]
    );
  };

  // 6. Smooth Slide-Up + Fade Text transition between step indices
  const transitionToStep = (nextStep: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: -15,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(nextStep);
      translateYAnim.setValue(20);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  // 7. Save Prayer Request (Step 3 Reflection action)
  const handleSaveReflection = async () => {
    if (!reflectionText.trim()) return;

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const title = t("guidedPrayer.reflectionNoteTitle", {
        date: new Intl.DateTimeFormat(localeTag).format(new Date()),
      });
      await useNotesStore.getState().saveNote(null, title, reflectionText.trim());
      setIsReflectionSaved(true);
    } catch (err) {
      console.error("Failed to save prayer reflection note:", err);
    }
  };

  // 8. Schedule reminder natively
  const handleScheduleReminder = async (hour: number, minute: number) => {
    try {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          t("common.appName"),
          t("settings.notificationsHint")
        );
        return;
      }

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await scheduleDailyReminder(
        hour,
        minute,
        t("common.appName"),
        t("guidedPrayer.habitMessage")
      );

      setReminderStoreTime(hour, minute);
      setReminderStoreEnabled(true);
    } catch (err) {
      console.error("Failed to schedule daily reminder notification:", err);
    }
  };

  const handleFinishFlow = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const { recordActivity } = await import("@/services/stats/userStats");
    void recordActivity("prayer");
    router.back();
  };

  // Habit Options List helper
  const reminderOptions = [
    { hour: 8, minute: 0, label: t("guidedPrayer.reminderMorning") },
    { hour: 20, minute: 0, label: t("guidedPrayer.reminderEvening") },
    { hour: 21, minute: 30, label: t("guidedPrayer.reminderBeforeSleep") },
  ];

  const verse = dailyVerse;
  const verseReference = useMemo(
    () =>
      verse
        ? formatBookReference(
            verse.book_slug,
            verse.chapter_number,
            verse.number,
            locale,
            verse.book_name
          )
        : "",
    [locale, verse]
  );

  const renderStepHero = (title: string, subtitle: string) => (
    <View style={styles.stageHeroFrame}>
      <ImageBackground
        source={activeVisual.image}
        resizeMode="cover"
        style={styles.stageHeroImage}
        imageStyle={styles.stageHeroImageRadius}
      >
        <View style={styles.stageHeroShade} />
        <View style={styles.stageHeroContent}>
          <View style={styles.stepIconBadge}>
            <Ionicons name={activeVisual.icon} size={24} color={colors.accent} />
          </View>
          <Text style={[styles.goldHeading, styles.stageHeroTitle]}>{title}</Text>
          <Text style={[styles.subtitle, styles.stageHeroSubtitle]}>{subtitle}</Text>
        </View>
      </ImageBackground>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View pointerEvents="none" style={styles.visualBackground}>
        <ImageBackground
          source={activeVisual.image}
          resizeMode="cover"
          style={styles.visualBackgroundFill}
          imageStyle={styles.visualBackgroundImage}
        >
          <View style={styles.backgroundVeil} />
          <View style={styles.backgroundTopShade} />
          <View style={styles.backgroundBottomShade} />
        </ImageBackground>
      </View>

      {/* Header bar */}
      <View style={styles.header}>
        <Pressable
          onPress={handleExitPress}
          hitSlop={16}
          style={styles.closeButton}
          accessibilityLabel={t("guidedPrayer.exitAlertConfirm")}
        >
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("guidedPrayer.title")}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.contentContainer,
              { opacity: fadeAnim, transform: [{ translateY: translateYAnim }] },
            ]}
          >
            {/* Step 1: Welcome ("Witaj") */}
            {step === 0 && (
              <View style={styles.stepBox}>
                {renderStepHero(t("guidedPrayer.welcome"), t("guidedPrayer.welcomeSubtitle"))}

                <View style={styles.breathWaveContainer}>
                  <Animated.View
                    style={[
                      styles.breathWaveHalo,
                      { transform: [{ scale: breathAnim }] },
                    ]}
                  />
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <Animated.View
                      key={idx}
                      style={[
                        styles.breathWaveBar,
                        {
                          height: 34 + (4 - Math.abs(2 - idx)) * 11,
                          transform: [
                            {
                              scaleY: breathAnim.interpolate({
                                inputRange: [0.95, 1.25],
                                outputRange: [0.72, 1.16],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  ))}
                </View>

                <Text style={styles.welcomeText}>
                  {t("guidedPrayer.welcomeText")}
                </Text>
              </View>
            )}

            {/* Step 2: Adoration ("Uhonoruj Boga") */}
            {step === 1 && (
              <View style={styles.stepBox}>
                {renderStepHero(t("guidedPrayer.adoration"), t("guidedPrayer.adorationSubtitle"))}

                {isGenerating ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={styles.loadingText}>
                      {t("guidedPrayer.adorationLoading")}
                    </Text>
                  </View>
                ) : (
                  <GlassCard style={styles.adorationCard}>
                    <Text style={styles.adorationContent}>
                      {adorationText}
                    </Text>
                    {verse && (
                      <Text style={styles.scriptureBaseRef}>
                        {t("guidedPrayer.referenceLabel", { reference: verseReference })}
                      </Text>
                    )}
                  </GlassCard>
                )}
              </View>
            )}

            {/* Step 3: Reflection & Action ("Moje Troski") */}
            {step === 2 && (
              <View style={styles.stepBox}>
                {renderStepHero(t("guidedPrayer.reflection"), t("guidedPrayer.reflectionSubtitle"))}

                {verse && (
                  <GlassCard style={styles.verseReflectionCard}>
                    <Ionicons name="bookmark" size={16} color={colors.accent} style={styles.verseIcon} />
                    <Text style={styles.verseText}>
                      {t("guidedPrayer.verseQuote", { verse: verse.text })}
                    </Text>
                    <Text style={styles.verseRefLabel}>
                      {t("guidedPrayer.referenceLabel", { reference: verseReference })}
                    </Text>
                  </GlassCard>
                )}

                <View style={[
                  styles.inputWrapper,
                  isInputFocused && styles.inputWrapperFocused,
                  isReflectionSaved && styles.inputWrapperSuccess,
                ]}>
                  <TextInput
                    value={reflectionText}
                    onChangeText={(txt) => {
                      setReflectionText(txt);
                      setIsReflectionSaved(false);
                    }}
                    placeholder={t("guidedPrayer.prayerInputPlaceholder")}
                    placeholderTextColor={colors.textMuted}
                    style={styles.reflectionInput}
                    multiline
                    numberOfLines={4}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    editable={!isReflectionSaved}
                  />

                  {reflectionText.trim().length > 0 && !isReflectionSaved && (
                    <Pressable
                      onPress={handleSaveReflection}
                      style={styles.addPrayerButton}
                      accessibilityRole="button"
                    >
                      <Ionicons name="add" size={16} color={colors.canvas} />
                      <Text style={styles.addPrayerButtonText}>
                        {t("guidedPrayer.addPrayer")}
                      </Text>
                    </Pressable>
                  )}

                  {isReflectionSaved && (
                    <View style={styles.successRow}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                      <Text style={styles.successText}>
                        {t("guidedPrayer.reflectionSaved")}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Step 4: Habit Loop ("Nawyk") */}
            {step === 3 && (
              <View style={styles.stepBox}>
                {renderStepHero(t("guidedPrayer.habit"), t("guidedPrayer.habitSubtitle"))}

                <Text style={styles.habitMessageText}>
                  {t("guidedPrayer.habitMessage")}
                </Text>

                <View style={styles.reminderScheduleSection}>
                  <Text style={styles.reminderSectionHeader}>
                    {t("guidedPrayer.reminderSectionHeader")}
                  </Text>

                  {reminderOptions.map((opt) => {
                    const isOptionSelected =
                      activeReminderEnabled &&
                      reminderHour === opt.hour &&
                      reminderMinute === opt.minute;

                    return (
                      <Pressable
                        key={`${opt.hour}-${opt.minute}`}
                        onPress={() => handleScheduleReminder(opt.hour, opt.minute)}
                        style={[
                          styles.reminderCard,
                          isOptionSelected && styles.reminderCardSelected,
                        ]}
                      >
                        <View style={styles.reminderCardInfo}>
                          <Ionicons
                            name="alarm-outline"
                            size={18}
                            color={isOptionSelected ? colors.accent : colors.textSecondary}
                          />
                          <Text style={[
                            styles.reminderCardLabel,
                            isOptionSelected && styles.reminderCardLabelSelected,
                          ]}>
                            {opt.label}
                          </Text>
                        </View>
                        {isOptionSelected && (
                          <Ionicons name="checkmark" size={18} color={colors.accent} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Vertical capsule step timeline indicator in the bottom-right */}
      <View style={styles.indicatorContainer}>
        {Array.from({ length: 4 }).map((_, idx) => {
          const isActive = idx === step;
          return (
            <View
              key={idx}
              style={[
                styles.indicatorSegment,
                isActive && styles.indicatorSegmentActive,
              ]}
            />
          );
        })}
      </View>

      {/* Footer controls bar */}
      <View style={styles.footer}>
        {step < 3 ? (
          <Pressable
            onPress={() => transitionToStep(step + 1)}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {t("guidedPrayer.continueButton")}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={colors.canvas} />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleFinishFlow}
            style={({ pressed }) => [
              styles.finishButton,
              pressed && styles.finishButtonPressed,
            ]}
          >
            <Text style={styles.finishButtonText}>
              {t("guidedPrayer.finishButton")}
            </Text>
            <Ionicons name="sparkles" size={16} color={colors.canvas} />
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  visualBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  visualBackgroundFill: {
    flex: 1,
  },
  visualBackgroundImage: {
    opacity: 0.86,
  },
  backgroundVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.56)",
  },
  backgroundTopShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: "rgba(0, 0, 0, 0.58)",
  },
  backgroundBottomShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 360,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
    backgroundColor: "rgba(3, 4, 8, 0.72)",
  },
  headerTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerPlaceholder: {
    width: 32,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + 40,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: spacing.lg,
  },
  stepBox: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  stageHeroFrame: {
    width: "100%",
    height: 245,
    marginBottom: spacing.xl,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(229, 169, 60, 0.3)",
    backgroundColor: colors.backgroundElevated,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
  stageHeroImage: {
    flex: 1,
    justifyContent: "flex-end",
  },
  stageHeroImageRadius: {
    borderRadius: radii.lg,
  },
  stageHeroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.32)",
  },
  stageHeroContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: "rgba(0, 0, 0, 0.14)",
  },
  stepIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    backgroundColor: "rgba(8, 10, 16, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(229, 169, 60, 0.42)",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  goldHeading: {
    ...typography.hero,
    color: colors.accent,
    textAlign: "center",
    fontWeight: "800",
    marginBottom: spacing.xs,
    textShadowColor: "rgba(0, 0, 0, 0.65)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
    fontWeight: "500",
    textShadowColor: "rgba(0, 0, 0, 0.72)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  stageHeroTitle: {
    marginBottom: spacing.xs,
  },
  stageHeroSubtitle: {
    color: colors.textPrimary,
    marginBottom: 0,
  },
  welcomeText: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 26,
    width: "100%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.09)",
    backgroundColor: "rgba(6, 8, 13, 0.62)",
  },
  breathWaveContainer: {
    width: "100%",
    height: 112,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.09)",
    backgroundColor: "rgba(6, 8, 13, 0.58)",
  },
  breathWaveHalo: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: colors.accent,
    opacity: 0.34,
  },
  breathWaveBar: {
    width: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 9,
  },
  loadingBox: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: "center",
  },
  adorationCard: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: colors.accent,
    padding: spacing.lg,
    backgroundColor: "rgba(5, 7, 11, 0.72)",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  adorationContent: {
    ...typography.verse,
    color: colors.textPrimary,
    fontStyle: "italic",
    lineHeight: 32,
    textAlign: "center",
  },
  scriptureBaseRef: {
    ...typography.caption,
    color: colors.accent,
    textAlign: "right",
    marginTop: spacing.md,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  verseReflectionCard: {
    width: "100%",
    padding: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: "rgba(5, 7, 11, 0.7)",
  },
  verseIcon: {
    alignSelf: "center",
    marginBottom: spacing.xs,
  },
  verseText: {
    ...typography.body,
    color: colors.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 24,
  },
  verseRefLabel: {
    ...typography.caption,
    color: colors.accent,
    textAlign: "center",
    marginTop: spacing.xs,
    fontWeight: "600",
  },
  inputWrapper: {
    width: "100%",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(5, 7, 11, 0.72)",
    padding: spacing.sm,
  },
  inputWrapperFocused: {
    borderColor: colors.accent,
  },
  inputWrapperSuccess: {
    borderColor: colors.success,
    backgroundColor: "rgba(52, 211, 153, 0.02)",
  },
  reflectionInput: {
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: "top",
    padding: spacing.xs,
  },
  addPrayerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.sm,
    gap: 4,
  },
  addPrayerButtonText: {
    ...typography.caption,
    color: colors.canvas,
    fontWeight: "700",
  },
  successRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  successText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: "600",
  },
  habitMessageText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  reminderScheduleSection: {
    width: "100%",
    gap: spacing.sm,
  },
  reminderSectionHeader: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  reminderCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentGlow,
  },
  reminderCardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  reminderCardLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  reminderCardLabelSelected: {
    color: colors.accent,
    fontWeight: "600",
  },
  indicatorContainer: {
    position: "absolute",
    right: spacing.md,
    bottom: 120,
    width: 12,
    flexDirection: "column",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  indicatorSegment: {
    width: 4,
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  indicatorSegmentActive: {
    height: 24,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorder,
    backgroundColor: "rgba(3, 4, 8, 0.88)",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    ...typography.subtitle,
    color: colors.canvas,
    fontWeight: "700",
  },
  finishButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  finishButtonPressed: {
    opacity: 0.9,
  },
  finishButtonText: {
    ...typography.subtitle,
    color: colors.canvas,
    fontWeight: "700",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

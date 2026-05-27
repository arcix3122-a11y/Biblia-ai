import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
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
import { useTranslation } from "react-i18next";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "@/theme";
import { GlassCard } from "@/components/GlassCard";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import { callLiveChatCompletion, hasLlmApiKey, type ChatCompletionMessage } from "@/services/ai/llmClient";
import { useNotesStore } from "@/store/notesStore";
import { useReminderStore } from "@/store/reminderStore";
import { useLocaleStore } from "@/store/localeStore";
import { useActiveTranslation } from "@/store/translationStore";
import { scheduleDailyReminder, requestNotificationPermission } from "@/services/notifications/reminderService";
import type { VerseWithReference } from "@/types/scripture";
import { formatBookReference } from "@/i18n/bookNames";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AUDIO_STREAM_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3";

export default function GuidedPrayerScreen() {
  const { t, i18n } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
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
          { uri: AUDIO_STREAM_URL },
          { shouldPlay: true, isLooping: true, volume: 0.20 }
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
      const lang = i18n.language || "pl";
      const systemPrompt = `You are an elite, modern spiritual guide inside a digital Cyber-Monastery. Generate a premium, deep, comforting, short adoration prayer (3 sentences max) based on the scripture of the day.
Language: ${lang === "pl" ? "Polish" : "English"}.
Tone: Luxuriously poetic, peaceful, contemplative.
Do NOT use markdown styles (bold, italics) or introductory greetings; return ONLY the raw prayer text.`;

      const verseRef = formatBookReference(
        activeVerse.book_slug,
        activeVerse.chapter_number,
        activeVerse.number,
        locale,
        activeVerse.book_name
      );
      const userPrompt = `Verse context: "${activeVerse.text}" (${verseRef})`;

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
          const fallback = lang === "pl"
            ? `Wszechmogący Boże, w świetle słów z ${verseRef} („${activeVerse.text}”), uwielbiamy Twoją nieskończoną świętość. Ty jesteś cichym schronieniem naszych niespokojnych serc. W tej świętej przestrzeni oddajemy Ci chwałę za Twoją bezwarunkową miłość, która rozświetla wszelką ciemność. Amen.`
            : `Lord God, in the light of Your word from ${verseRef} ("${activeVerse.text}"), we praise Your infinite holiness. You are the quiet sanctuary for our restless souls. In this sacred space, we glorify You for Your unconditional love that illuminates all darkness. Amen.`;
          setAdorationText(fallback);
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
  }, [dailyVerse, i18n.language, locale]);

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
        { text: t("common.cancel", "Anuluj"), style: "cancel" },
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
      const title = `${t("guidedPrayer.reflection")} — ${new Date().toLocaleDateString()}`;
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
    router.back();
  };

  // Habit Options List helper
  const reminderOptions = [
    { hour: 8, minute: 0, label: i18n.language === "pl" ? "Modlitwa poranna (08:00)" : "Morning Prayer (08:00)" },
    { hour: 20, minute: 0, label: i18n.language === "pl" ? "Modlitwa wieczorna (20:00)" : "Evening Prayer (20:00)" },
    { hour: 21, minute: 30, label: i18n.language === "pl" ? "Przed snem (21:30)" : "Before Sleep (21:30)" },
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

  return (
    <SafeAreaView style={styles.container}>
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
                <Text style={styles.goldHeading}>{t("guidedPrayer.welcome")}</Text>
                <Text style={styles.subtitle}>{t("guidedPrayer.welcomeSubtitle")}</Text>

                {/* Ambient Breathing Circle Ring */}
                <View style={styles.pulseContainer}>
                  <Animated.View
                    style={[
                      styles.breathCircleRing,
                      { transform: [{ scale: breathAnim }] },
                    ]}
                  />
                  <View style={styles.breathCircleCenter}>
                    <Ionicons name="heart" size={32} color={colors.accent} />
                  </View>
                </View>

                <Text style={styles.welcomeText}>
                  {t("guidedPrayer.welcomeText")}
                </Text>
              </View>
            )}

            {/* Step 2: Adoration ("Uhonoruj Boga") */}
            {step === 1 && (
              <View style={styles.stepBox}>
                <Text style={styles.goldHeading}>{t("guidedPrayer.adoration")}</Text>
                <Text style={styles.subtitle}>{t("guidedPrayer.adorationSubtitle")}</Text>

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
                        — {verseReference}
                      </Text>
                    )}
                  </GlassCard>
                )}
              </View>
            )}

            {/* Step 3: Reflection & Action ("Moje Troski") */}
            {step === 2 && (
              <View style={styles.stepBox}>
                <Text style={styles.goldHeading}>{t("guidedPrayer.reflection")}</Text>
                <Text style={styles.subtitle}>{t("guidedPrayer.reflectionSubtitle")}</Text>

                {verse && (
                  <GlassCard style={styles.verseReflectionCard}>
                    <Ionicons name="bookmark" size={16} color={colors.accent} style={styles.verseIcon} />
                    <Text style={styles.verseText}>
                      „{verse.text}”
                    </Text>
                    <Text style={styles.verseRefLabel}>
                      — {verseReference}
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
                        {i18n.language === "pl" ? "Dodano do Twoich modlitewnych intencji" : "Saved to your prayer reflections"}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Step 4: Habit Loop ("Nawyk") */}
            {step === 3 && (
              <View style={styles.stepBox}>
                <Text style={styles.goldHeading}>{t("guidedPrayer.habit")}</Text>
                <Text style={styles.subtitle}>{t("guidedPrayer.habitSubtitle")}</Text>

                <Text style={styles.habitMessageText}>
                  {t("guidedPrayer.habitMessage")}
                </Text>

                <View style={styles.reminderScheduleSection}>
                  <Text style={styles.reminderSectionHeader}>
                    {i18n.language === "pl" ? "Skonfiguruj codzienne przypomnienie:" : "Configure daily reminder:"}
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
  goldHeading: {
    ...typography.hero,
    color: colors.accent,
    textAlign: "center",
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
    fontWeight: "500",
  },
  welcomeText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xl,
  },
  pulseContainer: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  breathCircleRing: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: colors.accentGlow,
    borderWidth: 1.5,
    borderColor: colors.accent,
    opacity: 0.75,
  },
  breathCircleCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
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
    backgroundColor: "rgba(229,169,60,0.03)",
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
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
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
    backgroundColor: colors.background,
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

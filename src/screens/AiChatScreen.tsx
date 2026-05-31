import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigation } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AiModePill } from "@/components/ai/AiModePill";
import { AnimatedSacredBackdrop } from "@/components/ai/AnimatedSacredBackdrop";
import { ContextPills } from "@/components/ai/ContextPills";
import { ChatBubble } from "@/components/ChatBubble";
import { GlassChrome } from "@/components/GlassChrome";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import { useTabBarInset } from "@/hooks/useTabBarInset";
import { getAssistantRequestTrace } from "@/services/ai/assistantRequestTrace";
import { useSpiritualAssistant } from "@/hooks/useSpiritualAssistant";
import {
  buildQuickPromptMessage,
  getAssistantQuickPrompts,
} from "@/services/ai/spiritualAssistantProfile";
import { useAiChatStore } from "@/store/aiChatStore";
import { useSelectionStore } from "@/store/selectionStore";
import { colors, radii, spacing, typography } from "@/theme";
import { hapticError, hapticLight, hapticMedium, hapticSelection } from "@/utils/haptics";
import type { ContextPillTemplateId } from "@/types/ui";

export default function AiChatScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { paddingBottom: tabBarScrollPadding, tabBarHeight } = useTabBarInset();
  const { t, locale } = useAppTranslation();
  const translate = (key: string) => t(key as never);
  const { starterMood } = useLocalSearchParams<{ starterMood?: string }>();
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList>(null);
  const handledStarterRef = useRef<string | null>(null);
  const messages = useAiChatStore((state) => state.messages);
  const clearConversation = useAiChatStore((state) => state.clearConversation);
  const ensureWelcomeMessage = useAiChatStore((state) => state.ensureWelcomeMessage);
  const refreshIntroMessage = useAiChatStore((state) => state.refreshIntroMessage);
  const syncDailyQuota = useAiChatStore((state) => state.syncDailyQuota);
  const selectedVerse = useSelectionStore((state) => state.selectedVerse);
  const {
    sendMessage,
    sendWithContext,
    isThinking,
    canSend,
    remaining,
    limit,
    isUnlimitedQuota,
    donorTier,
    connectionWarning,
    clearConnectionWarning,
    lastInput,
    assistantMode,
    modeLabel,
    modeReason,
    lastResponseMode,
    lastLlmError,
    lastReplyUsedTemplate,
    provider,
    lastLlmStatusCode,
  } = useSpiritualAssistant();

  const showDevLlmDebug = false;
  const [devDebugExpanded, setDevDebugExpanded] = useState(false);

  const quickPrompts = useMemo(() => getAssistantQuickPrompts(), []);
  const hasUserMessages = messages.some((message) => message.role === "user");
  const showQuickPrompts = !hasUserMessages;
  const remainingCount = remaining();
  const quotaExhausted = !canSend();
  const showLowQuotaWarning = !quotaExhausted && remainingCount <= 3 && remainingCount > 0;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <AiModePill
          mode={assistantMode}
          label={modeLabel}
          reason={modeReason}
          compact
        />
      ),
    });
  }, [assistantMode, modeLabel, modeReason, navigation]);

  const scrollToEnd = (animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  };

  useEffect(() => {
    syncDailyQuota();
    ensureWelcomeMessage();
  }, [ensureWelcomeMessage, syncDailyQuota]);

  useEffect(() => {
    refreshIntroMessage();
  }, [locale, refreshIntroMessage]);

  useEffect(() => {
    scrollToEnd(messages.length > 2);
  }, [messages.length]);

  useEffect(() => {
    const mood = typeof starterMood === "string" ? starterMood : "";
    const allowedMoods = ["love", "anxiety", "healing", "anger", "chapter"] as const;
    type AllowedMood = (typeof allowedMoods)[number];

    const starterPrompts: Record<AllowedMood, string> = {
      love: t("home.emotionPrompts.love"),
      anxiety: t("home.emotionPrompts.anxiety"),
      healing: t("home.emotionPrompts.healing"),
      anger: t("home.emotionPrompts.anger"),
      chapter: t("ai.chapterReflectionStarter"),
    };

    if (
      !mood ||
      handledStarterRef.current === mood ||
      !allowedMoods.includes(mood as AllowedMood)
    ) {
      return;
    }

    handledStarterRef.current = mood;
    void hapticMedium();
    void sendMessage(starterPrompts[mood as AllowedMood], selectedVerse).then((sent) => {
      if (sent) {
        scrollToEnd();
      }
    });
  }, [selectedVerse, sendMessage, starterMood, t]);

  const handleRetry = async () => {
    clearConnectionWarning();
    void hapticLight();
    if (!lastInput) {
      return;
    }

    const sent = await sendMessage(lastInput, selectedVerse);
    if (sent) {
      scrollToEnd();
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    void hapticSelection();
    const sent = await sendMessage(trimmed, selectedVerse);
    if (sent) {
      setInput("");
      scrollToEnd();
      return;
    }

    void hapticError();
  };

  const handlePill = async (templateId: ContextPillTemplateId) => {
    if (!selectedVerse) {
      return;
    }

    void hapticLight();
    const sent = await sendWithContext(templateId, selectedVerse);
    if (sent) {
      scrollToEnd();
    }
  };

  const handleQuickPrompt = async (promptId: (typeof quickPrompts)[number]["id"]) => {
    const prompt = buildQuickPromptMessage(promptId);
    void hapticMedium();
    const sent = await sendMessage(prompt, selectedVerse);
    if (sent) {
      scrollToEnd();
    }
  };

  const handleClearChat = () => {
    void hapticLight();
    clearConversation();
    scrollToEnd(false);
  };

  const disabled = !canSend() || isThinking || input.trim().length === 0;

  return (
    <View style={styles.screen}>
      <AnimatedSacredBackdrop />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={88}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarScrollPadding + 120 }]}
          renderItem={({ item }) => <ChatBubble message={item} />}
          ListHeaderComponent={
            <View style={styles.headerStack}>
              <View style={styles.heroCard}>
                <View style={styles.heroTopRow}>
                  <Text style={styles.heroEyebrow}>{t("ai.heroEyebrow")}</Text>
                  <AiModePill mode={assistantMode} label={modeLabel} />
                </View>

                <Text style={styles.heroTitle}>{t("ai.heroTitle")}</Text>
                <Text style={styles.heroBody}>{t("ai.heroBody")}</Text>

                <View style={styles.basisRow}>
                  <View style={styles.basisChip}>
                    <Text style={styles.basisChipText}>{t("ai.basisScripture")}</Text>
                  </View>
                  <View style={styles.basisChip}>
                    <Text style={styles.basisChipText}>{t("ai.basisPrayer")}</Text>
                  </View>
                  <View style={styles.basisChip}>
                    <Text style={styles.basisChipText}>{t("ai.basisDiscernment")}</Text>
                  </View>
                </View>

                <Text style={styles.modeHint}>{modeReason}</Text>

                {showDevLlmDebug ? (
                  <View style={styles.devLlmDebug}>
                    <Pressable
                      onPress={() => setDevDebugExpanded((value) => !value)}
                      accessibilityRole="button"
                    >
                      <Text style={styles.devLlmDebugLabel}>
                        {t("ai.devDebug.summary", {
                          provider: provider || t("ai.devDebug.providerUnknown"),
                          status:
                            lastLlmStatusCode !== null
                              ? String(lastLlmStatusCode)
                              : t("ai.devDebug.statusUnknown"),
                          template: lastReplyUsedTemplate
                            ? t("ai.devDebug.templateYes")
                            : t("ai.devDebug.templateNo"),
                          mode: lastResponseMode ?? t("ai.devDebug.modeUnknown"),
                        })}
                      </Text>
                    </Pressable>
                    {devDebugExpanded ? (
                      <View style={styles.devLlmDebugDetails}>
                        {lastLlmError ? (
                          <Text style={styles.devLlmDebugDetail}>{lastLlmError}</Text>
                        ) : null}
                        {getAssistantRequestTrace().map((entry) => (
                          <Text key={entry.at} style={styles.devLlmDebugDetail}>
                            {t("ai.devDebug.traceLine", {
                              hash: entry.payloadHash,
                              origin:
                                entry.origin === "api"
                                  ? t("ai.devDebug.originApi")
                                  : t("ai.devDebug.originTemplate"),
                            })}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.guardrailCard}>
                  <View style={styles.guardrailIcon}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={18}
                      color={colors.accent}
                    />
                  </View>
                  <View style={styles.guardrailCopy}>
                    <Text style={styles.guardrailTitle}>{t("ai.guardrailTitle")}</Text>
                    <Text style={styles.guardrailBody}>{t("ai.guardrailBody")}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.anchorCard}>
                <View style={styles.anchorTitleRow}>
                  <Ionicons
                    name={selectedVerse ? "bookmark-outline" : "book-outline"}
                    size={16}
                    color={colors.accent}
                  />
                  <Text style={styles.anchorTitle}>
                    {selectedVerse
                      ? t("ai.selectedVerse")
                      : t("ai.selectedVerseHintTitle")}
                  </Text>
                </View>

                {selectedVerse ? (
                  <>
                    <Text style={styles.anchorReference}>
                      {selectedVerse.bookName} {selectedVerse.chapter}:{selectedVerse.verse}
                    </Text>
                    <Text style={styles.anchorVerse} numberOfLines={4}>
                      {selectedVerse.text}
                    </Text>
                    <Text style={styles.anchorHint}>{t("ai.selectedVerseActiveHint")}</Text>
                    <ContextPills
                      onSelectTemplate={(templateId) => void handlePill(templateId)}
                      disabled={!canSend() || isThinking}
                    />
                  </>
                ) : (
                  <Text style={styles.anchorEmpty}>{t("ai.selectedVerseHintBody")}</Text>
                )}
              </View>

              {showQuickPrompts ? (
                <View style={styles.quickPromptSection}>
                  <Text style={styles.quickPromptTitle}>{t("ai.quickPromptsTitle")}</Text>
                  <Text style={styles.quickPromptHint}>{t("ai.quickPromptsHint")}</Text>

                  <View style={styles.quickPromptGrid}>
                    {quickPrompts.map((prompt) => (
                      <Pressable
                        key={prompt.id}
                        onPress={() => void handleQuickPrompt(prompt.id)}
                        style={styles.quickPromptCard}
                        accessibilityRole="button"
                      >
                        <View style={styles.quickPromptIcon}>
                          <Ionicons
                            name={prompt.icon as keyof typeof Ionicons.glyphMap}
                            size={18}
                            color={colors.accent}
                          />
                        </View>
                          <Text style={styles.quickPromptCardTitle}>
                            {translate(prompt.titleKey)}
                          </Text>
                          <Text style={styles.quickPromptCardSubtitle}>
                            {translate(prompt.subtitleKey)}
                          </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          }
          ListFooterComponent={
            isThinking ? (
              <View style={styles.thinking}>
                <ActivityIndicator color={colors.accent} size="small" />
                <Text style={styles.thinkingText}>{t("ai.reflecting")}</Text>
              </View>
            ) : (
              <View style={styles.bottomSpacer} />
            )
          }
        />

        <GlassChrome
          style={[styles.composerChrome, { paddingBottom: Math.max(tabBarHeight, insets.bottom) + spacing.sm }]}
        >
          <View style={styles.composerMeta}>
            <View>
              <Text style={styles.quotaText}>
                {isUnlimitedQuota
                  ? t("ai.quota.unlimited")
                  : t("ai.quota.dailyRemaining", {
                      remaining: remainingCount,
                      limit,
                    })}
              </Text>
              <Text style={styles.quotaHint}>
                {donorTier
                  ? t("ai.quota.tierBonus", { tier: t(`donorTier.${donorTier}`) })
                  : t("ai.quotaHint")}
              </Text>
            </View>
            <Pressable
              onPress={handleClearChat}
              hitSlop={8}
              accessibilityLabel={t("ai.clearChat")}
            >
              <Text style={styles.clearLink}>{t("common.clear")}</Text>
            </Pressable>
          </View>

          {connectionWarning ? (
            <View style={styles.warningBanner}>
              <View style={styles.warningCopy}>
                <Text style={styles.warningTitle}>{t("ai.usingOfflineCompanion")}</Text>
                <Text style={styles.warningText}>{connectionWarning}</Text>
              </View>
              {lastInput ? (
                <Pressable
                  onPress={() => void handleRetry()}
                  style={styles.retryButton}
                  accessibilityRole="button"
                >
                  <Text style={styles.retryButtonText}>{t("ai.retry")}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {showLowQuotaWarning ? (
            <View style={styles.lowQuotaBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.accent} />
              <Text style={styles.lowQuotaBannerText}>
                {t("ai.quota.dailyRemaining", {
                  remaining: remainingCount,
                  limit,
                })}
              </Text>
            </View>
          ) : null}

          {quotaExhausted ? (
            <View style={styles.limitBanner}>
              <View style={styles.limitBannerCopy}>
                <Text style={styles.limitBannerTitle}>{t("ai.quota.limitReachedTitle")}</Text>
                <Text style={styles.limitBannerText}>{t("ai.quota.limitReachedBody")}</Text>
              </View>
              <Pressable
                onPress={() => router.push("/donate")}
                style={styles.upgradeButton}
                accessibilityRole="button"
              >
                <Text style={styles.upgradeButtonText}>{t("ai.quota.upgradeCta")}</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.composerShell}>
            <TextInput
              value={input}
              onChangeText={(value) => {
                if (connectionWarning) {
                  clearConnectionWarning();
                }
                setInput(value);
              }}
              placeholder={canSend() ? t("ai.inputPlaceholder") : t("ai.inputLimitReached")}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              editable={canSend() && !isThinking}
              multiline
              maxLength={500}
              textAlignVertical="top"
              selectionColor={colors.accent}
            />

            <Pressable
              onPress={() => void handleSend()}
              disabled={disabled}
              style={[styles.sendButton, disabled && styles.sendButtonDisabled]}
              accessibilityRole="button"
              accessibilityLabel={t("common.send")}
            >
              <Ionicons name="arrow-up" size={20} color={colors.canvas} />
            </Pressable>
          </View>
        </GlassChrome>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    flex: 1,
  },
  listContent: {},
  headerStack: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  heroCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(229,169,60,0.12)",
    backgroundColor: "rgba(8, 12, 21, 0.84)",
    gap: spacing.md,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  heroEyebrow: {
    ...typography.label,
    color: colors.textMuted,
  },
  heroTitle: {
    ...typography.hero,
    color: colors.textPrimary,
  },
  heroBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
  basisRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  basisChip: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  basisChipText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  modeHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  devLlmDebug: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(229,169,60,0.2)",
  },
  devLlmDebugLabel: {
    ...typography.caption,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    color: colors.accent,
  },
  devLlmDebugDetails: {
    marginTop: spacing.xs,
    gap: 2,
  },
  devLlmDebugDetail: {
    ...typography.caption,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    color: colors.textMuted,
  },
  guardrailCard: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  guardrailIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentGlow,
  },
  guardrailCopy: {
    flex: 1,
    gap: 4,
  },
  guardrailTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  guardrailBody: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  anchorCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: "rgba(8, 12, 21, 0.8)",
    gap: spacing.sm,
  },
  anchorTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  anchorTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  anchorReference: {
    ...typography.caption,
    color: colors.accent,
  },
  anchorVerse: {
    ...typography.body,
    color: colors.textPrimary,
  },
  anchorHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  anchorEmpty: {
    ...typography.body,
    color: colors.textSecondary,
  },
  quickPromptSection: {
    gap: spacing.xs,
  },
  quickPromptTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  quickPromptHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  quickPromptGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  quickPromptCard: {
    width: "48.5%",
    minHeight: 132,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: "rgba(10,16,29,0.78)",
    gap: spacing.sm,
  },
  quickPromptIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentGlow,
  },
  quickPromptCardTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  quickPromptCardSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  thinking: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  thinkingText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  bottomSpacer: {
    height: spacing.lg,
  },
  composerChrome: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorder,
  },
  composerMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  quotaText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  quotaHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  clearLink: {
    ...typography.caption,
    color: colors.accent,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: "rgba(229,169,60,0.12)",
    borderWidth: 1,
    borderColor: "rgba(229,169,60,0.18)",
  },
  warningCopy: {
    flex: 1,
    gap: 3,
  },
  warningTitle: {
    ...typography.caption,
    color: colors.accent,
  },
  warningText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  retryButtonText: {
    ...typography.caption,
    color: colors.accent,
  },
  limitBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: "rgba(229,169,60,0.12)",
    borderWidth: 1,
    borderColor: "rgba(229,169,60,0.18)",
    gap: spacing.sm,
  },
  limitBannerCopy: {
    gap: 4,
  },
  limitBannerTitle: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "600",
  },
  limitBannerText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  lowQuotaBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  lowQuotaBannerText: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  upgradeButton: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: "rgba(229,169,60,0.08)",
  },
  upgradeButtonText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "600",
  },
  composerShell: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  input: {
    flex: 1,
    minHeight: 58,
    maxHeight: 132,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(5, 9, 17, 0.9)",
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 4,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});

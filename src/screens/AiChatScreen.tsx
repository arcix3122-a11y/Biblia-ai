import React, { useEffect, useRef, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ContextPills } from "@/components/ai/ContextPills";
import { ChatBubble } from "@/components/ChatBubble";
import { GlassChrome } from "@/components/GlassChrome";
import { useSpiritualAssistant } from "@/hooks/useSpiritualAssistant";
import { useAiChatStore } from "@/store/aiChatStore";
import { useSelectionStore } from "@/store/selectionStore";
import { colors, radii, spacing, typography } from "@/theme";
import type { ContextPillTemplateId } from "@/types/ui";

export default function AiChatScreen() {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList>(null);
  const messages = useAiChatStore((s) => s.messages);
  const selectedVerse = useSelectionStore((s) => s.selectedVerse);
  const resetChat = useAiChatStore((s) => s.resetChat);
  const limit = useAiChatStore((s) => s.limit);
  const {
    sendMessage,
    sendWithContext,
    isThinking,
    canSend,
    remaining,
    connectionWarning: lastError,
    clearConnectionWarning: clearError,
    lastInput,
  } = useSpiritualAssistant();

  const showStarter = messages.length <= 1;

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  };

  useEffect(() => {
    if (!isThinking) {
      scrollToEnd();
    }
  }, [isThinking]);

  const handleRetry = async () => {
    clearError();
    if (lastInput) {
      const sent = await sendMessage(lastInput);
      if (sent) {
        scrollToEnd();
      }
    }
  };

  const handleSend = async () => {
    const sent = await sendMessage(input);
    if (sent) {
      setInput("");
      scrollToEnd();
    }
  };

  const handlePill = async (templateId: ContextPillTemplateId) => {
    const sent = await sendWithContext(templateId, selectedVerse);
    if (sent) {
      scrollToEnd();
    }
  };

  const disabled = !canSend() || isThinking || input.trim().length === 0 || lastError !== null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={88}
    >
      {selectedVerse ? (
        <View style={styles.contextBanner}>
          <Text style={styles.contextLabel}>{t("ai.selectedVerse")}</Text>
          <Text style={styles.contextRef}>
            {selectedVerse.bookName} {selectedVerse.chapter}:{selectedVerse.verse}
          </Text>
          <Text style={styles.contextSnippet} numberOfLines={2}>
            {selectedVerse.text}
          </Text>
        </View>
      ) : showStarter ? (
        <View style={styles.starterArea}>
          <View style={styles.starterIconWrap}>
            <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.accent} />
          </View>
          <Text style={styles.starterTitle}>{t("ai.starterTitle")}</Text>
          <Text style={styles.starterHint}>{t("ai.starterHint")}</Text>
        </View>
      ) : (
        <Text style={styles.contextHint}>{t("ai.contextHint")}</Text>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => <ChatBubble message={item} />}
        ListFooterComponent={
          isThinking ? (
            <View style={styles.thinking}>
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={styles.thinkingText}>{t("ai.reflecting")}</Text>
            </View>
          ) : null
        }
      />

      {!canSend() ? (
        <View style={styles.limitBanner}>
          <Text style={styles.limitBannerText}>{t("ai.limitReached")}</Text>
        </View>
      ) : null}

      {lastError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{lastError}</Text>
          <Pressable onPress={() => void handleRetry()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>{t("ai.retry")}</Text>
          </Pressable>
        </View>
      ) : null}

      <GlassChrome style={styles.composerChrome}>
        <View style={styles.composerMeta}>
          <Text style={styles.quotaText}>
            {t("ai.responsesRemaining", { remaining: remaining(), limit })}
          </Text>
          <Pressable
            onPress={resetChat}
            hitSlop={8}
            accessibilityLabel={t("ai.clearChat")}
          >
            <Text style={styles.clearLink}>{t("common.clear")}</Text>
          </Pressable>
        </View>
        <ContextPills
          onSelectTemplate={(id) => void handlePill(id)}
          disabled={!selectedVerse || !canSend() || isThinking}
        />
        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={canSend() ? t("ai.inputPlaceholder") : t("ai.inputLimitReached")}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            editable={canSend() && !isThinking && !lastError}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={() => void handleSend()}
            disabled={disabled}
            style={[styles.send, disabled && styles.sendDisabled]}
          >
            <Text style={styles.sendText}>{t("common.send")}</Text>
          </Pressable>
        </View>
      </GlassChrome>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  starterArea: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
    alignItems: "center",
    gap: spacing.sm,
  },
  starterIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.accentGlow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  starterTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    textAlign: "center",
  },
  starterHint: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  contextBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.tile,
  },
  contextLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  contextRef: {
    ...typography.caption,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  contextSnippet: {
    ...typography.body,
    color: colors.textSecondary,
  },
  contextHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  list: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    flexGrow: 1,
  },
  thinking: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  thinkingText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  composerChrome: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorder,
  },
  composerMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  quotaText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  clearLink: {
    ...typography.caption,
    color: colors.accent,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.inputBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  send: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendText: {
    ...typography.subtitle,
    color: colors.canvas,
  },
  limitBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    alignItems: "center",
  },
  limitBannerText: {
    ...typography.caption,
    color: colors.accent,
    textAlign: "center",
  },
  errorBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.danger,
    borderWidth: 1,
    borderColor: colors.danger,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  errorBannerText: {
    ...typography.caption,
    color: colors.canvas,
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.canvas,
  },
  retryButtonText: {
    ...typography.caption,
    color: colors.canvas,
  },
});

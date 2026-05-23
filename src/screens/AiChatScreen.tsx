import React, { useRef, useState } from "react";
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
import { ContextPills } from "@/components/ai/ContextPills";
import { ChatBubble } from "@/components/ChatBubble";
import { GlassChrome } from "@/components/GlassChrome";
import { useSpiritualAssistant } from "@/hooks/useSpiritualAssistant";
import { useAiChatStore } from "@/store/aiChatStore";
import { useSelectionStore } from "@/store/selectionStore";
import { colors, radii, spacing, typography } from "@/theme";
import type { ContextPillTemplateId } from "@/types/ui";

export default function AiChatScreen() {
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList>(null);
  const messages = useAiChatStore((s) => s.messages);
  const selectedVerse = useSelectionStore((s) => s.selectedVerse);
  const resetChat = useAiChatStore((s) => s.resetChat);
  const messageCount = useAiChatStore((s) => s.messageCount);
  const limit = useAiChatStore((s) => s.limit);
  const { sendMessage, sendWithContext, isThinking, canSend, remaining } = useSpiritualAssistant();

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
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

  const disabled = !canSend() || isThinking || input.trim().length === 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={88}
    >
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {messageCount} / {limit} messages used · {remaining()} left
          </Text>
        </View>
        <Pressable
          onPress={resetChat}
          style={styles.clearButton}
          accessibilityLabel="Clear chat history"
        >
          <Text style={styles.clearButtonText}>Clear</Text>
        </Pressable>
      </View>

      {selectedVerse ? (
        <View style={styles.contextBanner}>
          <Text style={styles.contextLabel}>Selected verse</Text>
          <Text style={styles.contextRef}>
            {selectedVerse.bookName} {selectedVerse.chapter}:{selectedVerse.verse}
          </Text>
          <Text style={styles.contextSnippet} numberOfLines={2}>
            {selectedVerse.text}
          </Text>
        </View>
      ) : (
        <Text style={styles.contextHint}>
          Tap or long-press a verse in the reader to enable contextual prompts.
        </Text>
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
              <Text style={styles.thinkingText}>Reflecting…</Text>
            </View>
          ) : null
        }
      />

      <GlassChrome>
        <ContextPills
          onSelectTemplate={(id) => void handlePill(id)}
          disabled={!selectedVerse || !canSend() || isThinking}
        />
        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={
              canSend() ? "Ask about Scripture, prayer, or faith…" : "Message limit reached"
            }
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            editable={canSend() && !isThinking}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={() => void handleSend()}
            disabled={disabled}
            style={[styles.send, disabled && styles.sendDisabled]}
          >
            <Text style={styles.sendText}>Send</Text>
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
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  clearButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  clearButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  badge: {
    backgroundColor: colors.accentGlow,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    ...typography.caption,
    color: colors.accent,
  },
  contextBanner: {
    marginHorizontal: spacing.md,
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
    marginBottom: spacing.sm,
  },
  list: {
    paddingVertical: spacing.md,
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
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: colors.inputBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  send: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: "center",
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendText: {
    ...typography.subtitle,
    color: colors.canvas,
  },
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  authorTag,
  deleteComment,
  isSocialAvailable,
  listComments,
  postComment,
  type VotdComment,
} from "@/services/social/votdSocialRepository";
import { getSessionUserId } from "@/services/supabase/supabaseClient";
import { useLocaleStore } from "@/store/localeStore";
import { getDeviceLocale } from "@/i18n";
import { formatNoteDate } from "@/utils/formatDate";
import { hapticLight, hapticSuccess } from "@/utils/haptics";
import { colors, radii, spacing, typography } from "@/theme";

const COMMENT_MAX = 600;

interface VotdCommentsSheetProps {
  visible: boolean;
  verseRef: string | null;
  reference: string;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

export function VotdCommentsSheet({
  visible,
  verseRef,
  reference,
  onClose,
  onCountChange,
}: VotdCommentsSheetProps) {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale) ?? getDeviceLocale();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<VotdComment[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const myUserId = getSessionUserId();
  const socialAvailable = isSocialAvailable();

  const refresh = useCallback(async () => {
    if (!verseRef || !socialAvailable) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listComments(verseRef);
      setComments(list);
      onCountChange?.(list.length);
    } catch (err) {
      setError(t("votdComments.loadError"));
    } finally {
      setLoading(false);
    }
  }, [onCountChange, socialAvailable, t, verseRef]);

  useEffect(() => {
    if (visible && verseRef) {
      void refresh();
    }
  }, [refresh, verseRef, visible]);

  const handleSend = useCallback(async () => {
    if (!verseRef || !socialAvailable) return;
    const trimmed = draft.trim();
    if (trimmed.length === 0 || posting) return;
    setPosting(true);
    setError(null);
    try {
      const created = await postComment(verseRef, trimmed);
      setComments((prev) => [created, ...prev]);
      onCountChange?.(comments.length + 1);
      setDraft("");
      void hapticSuccess();
    } catch (err) {
      setError(t("votdComments.postError"));
    } finally {
      setPosting(false);
    }
  }, [comments.length, draft, onCountChange, posting, socialAvailable, t, verseRef]);

  const handleDelete = useCallback(
    (commentId: string) => {
      Alert.alert(
        t("votdComments.deleteTitle"),
        t("votdComments.deleteMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: () => {
              void hapticLight();
              setComments((prev) => prev.filter((c) => c.id !== commentId));
              onCountChange?.(Math.max(0, comments.length - 1));
              void deleteComment(commentId).catch(() => {
                // restore on failure
                void refresh();
              });
            },
          },
        ]
      );
    },
    [comments.length, onCountChange, refresh, t]
  );

  const renderComment = useCallback(
    ({ item }: { item: VotdComment }) => {
      const mine = myUserId === item.user_id;
      return (
        <View style={[styles.commentRow, mine && styles.commentRowMine]}>
          <View style={styles.commentHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{authorTag(item.user_id).slice(0, 2)}</Text>
            </View>
            <View style={styles.commentMeta}>
              <Text style={styles.commentAuthor}>
                {mine
                  ? t("votdComments.you")
                  : `${t("votdComments.reader")} #${authorTag(item.user_id)}`}
              </Text>
              <Text style={styles.commentTime}>{formatNoteDate(item.created_at, locale)}</Text>
            </View>
            {mine ? (
              <Pressable
                onPress={() => handleDelete(item.id)}
                hitSlop={8}
                accessibilityLabel={t("common.delete")}
              >
                <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.commentBody}>{item.body}</Text>
        </View>
      );
    },
    [handleDelete, locale, myUserId, t]
  );

  const remaining = useMemo(() => COMMENT_MAX - draft.length, [draft.length]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.scrim}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kav}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.sm }]}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>{t("votdComments.title")}</Text>
                <Text style={styles.headerSub}>{reference}</Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                style={styles.closeBtn}
                accessibilityLabel={t("common.close")}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            {!socialAvailable ? (
              <View style={styles.offlineBlock}>
                <Ionicons name="cloud-offline-outline" size={24} color={colors.textMuted} />
                <Text style={styles.offlineText}>{t("votdComments.offlineHint")}</Text>
              </View>
            ) : (
              <>
                <View style={styles.listContainer}>
                  {loading && comments.length === 0 ? (
                    <View style={styles.loadingWrap}>
                      <ActivityIndicator color={colors.accent} />
                    </View>
                  ) : comments.length === 0 ? (
                    <View style={styles.emptyWrap}>
                      <Ionicons
                        name="chatbubbles-outline"
                        size={36}
                        color={colors.textMuted}
                      />
                      <Text style={styles.emptyText}>{t("votdComments.emptyTitle")}</Text>
                      <Text style={styles.emptyHint}>{t("votdComments.emptyHint")}</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={comments}
                      keyExtractor={(c) => c.id}
                      renderItem={renderComment}
                      ItemSeparatorComponent={() => <View style={styles.separator} />}
                      contentContainerStyle={styles.listContent}
                      keyboardShouldPersistTaps="handled"
                    />
                  )}
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.composer}>
                  <TextInput
                    ref={inputRef}
                    value={draft}
                    onChangeText={setDraft}
                    placeholder={t("votdComments.placeholder")}
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    multiline
                    maxLength={COMMENT_MAX}
                    accessibilityLabel={t("votdComments.placeholder")}
                  />
                  <View style={styles.composerActions}>
                    <Text style={styles.counter}>{remaining}</Text>
                    <Pressable
                      onPress={() => void handleSend()}
                      disabled={posting || draft.trim().length === 0}
                      style={[
                        styles.sendBtn,
                        (posting || draft.trim().length === 0) && styles.sendBtnDisabled,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={t("votdComments.post")}
                    >
                      {posting ? (
                        <ActivityIndicator size="small" color={colors.canvas} />
                      ) : (
                        <>
                          <Ionicons name="send" size={14} color={colors.canvas} />
                          <Text style={styles.sendLabel}>{t("votdComments.post")}</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  kav: {
    width: "100%",
  },
  sheet: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    maxHeight: "82%",
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.glassBorder,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  headerSub: {
    ...typography.caption,
    color: colors.accent,
    marginTop: 2,
    fontWeight: "700",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardHover,
  },
  listContainer: {
    minHeight: 220,
    maxHeight: 380,
  },
  loadingWrap: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyWrap: {
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  emptyHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  separator: {
    height: spacing.sm,
  },
  commentRow: {
    backgroundColor: colors.cardHover,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.sm + 2,
    gap: spacing.xs,
  },
  commentRowMine: {
    borderColor: colors.accentMuted,
    backgroundColor: colors.accentGlow,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
    fontSize: 11,
  },
  commentMeta: {
    flex: 1,
  },
  commentAuthor: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  commentTime: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  commentBody: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  composer: {
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorder,
    gap: spacing.xs,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56,
    maxHeight: 140,
    ...typography.body,
  },
  composerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counter: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 4,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendLabel: {
    ...typography.caption,
    color: colors.canvas,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  offlineBlock: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  offlineText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
});

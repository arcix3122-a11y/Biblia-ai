import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { logError } from "@/services/errors/errorLogger";
import { useDailyEngagementStore } from "@/store/dailyEngagementStore";
import { colors, radii, spacing, typography } from "@/theme";
import { decryptKeyIfNeeded } from "@/services/security/keyObfuscator";

export type ReflectionVariant = "meditation" | "silence";

interface Props {
  visible: boolean;
  variant: ReflectionVariant;
  verseText: string;
  verseReference: string;
  onClose: () => void;
}

function buildPrompt(variant: ReflectionVariant, ref: string, text: string, lang: string): string {
  const langInstruction = lang === "pl"
    ? "Odpowiedz po polsku."
    : "Reply in English.";

  if (variant === "meditation") {
    return `You are a gentle spiritual guide. Write a 150–200 word pastoral meditation on ${ref}: "${text}". Make it calming, personal, and focused on everyday application. No headings, no bullet points — flowing prose only. ${langInstruction}`;
  }
  return `You are a spiritual companion. Write a 100–130 word quiet reflection prompt for ${ref}: "${text}". Guide the reader into stillness and self-examination. No headings — flowing, prayerful prose. ${langInstruction}`;
}

const TYPEWRITER_INTERVAL_MS = 18;

export function GuidedReflectionSheet({ visible, variant, verseText, verseReference, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const markReflectionComplete = useDailyEngagementStore((s) => s.markReflectionComplete);
  const [status, setStatus] = useState<"idle" | "loading" | "typing" | "done" | "error">("idle");
  const [fullText, setFullText] = useState("");
  const [displayText, setDisplayText] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);

  const fetchReflection = useCallback(async () => {
    setStatus("loading");
    setFullText("");
    setDisplayText("");
    indexRef.current = 0;

    const rawApiKey = process.env.EXPO_PUBLIC_AI_API_KEY?.trim();
    const apiKey = rawApiKey ? decryptKeyIfNeeded(rawApiKey) : undefined;
    const endpoint =
      process.env.EXPO_PUBLIC_AI_API_URL?.trim() ||
      "https://api.groq.com/openai/v1/chat/completions";
    const model =
      process.env.EXPO_PUBLIC_AI_MODEL?.trim() ||
      "llama-3.3-70b-versatile";

    if (!apiKey) {
      setFullText(
        variant === "meditation"
          ? t("viralFeed.offlineMeditation")
          : t("viralFeed.offlineSilence")
      );
      setStatus("typing");
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.75,
          max_tokens: 350,
          messages: [
            {
              role: "system",
              content: "You are a gentle, theologically grounded spiritual guide. Write in warm, plain prose — no markdown, no bullet points, no headers.",
            },
            {
              role: "user",
              content: buildPrompt(variant, verseReference, verseText, i18n.language),
            },
          ],
        }),
      });

      if (!res.ok) {
        throw new Error(`AI reflection fetch failed: ${res.status}`);
      }

      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content?.trim() ?? "";
      if (!content) throw new Error("Empty AI response");
      setFullText(content);
      setStatus("typing");
    } catch (err) {
      logError(err, "guided-reflection-fetch", { variant });
      setFullText(
        variant === "meditation"
          ? t("viralFeed.offlineMeditation")
          : t("viralFeed.offlineSilence")
      );
      setStatus("typing");
    }
  }, [i18n.language, t, variant, verseReference, verseText]);

  useEffect(() => {
    if (visible) {
      void fetchReflection();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setStatus("idle");
      setFullText("");
      setDisplayText("");
      indexRef.current = 0;
    }
  }, [visible, fetchReflection]);

  useEffect(() => {
    if (status !== "typing" || !fullText) return;

    timerRef.current = setInterval(() => {
      indexRef.current += 1;
      const slice = fullText.slice(0, indexRef.current);
      setDisplayText(slice);
      if (indexRef.current >= fullText.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setStatus("done");
      }
    }, TYPEWRITER_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, fullText]);

  const title = variant === "meditation"
    ? t("viralFeed.reflectionTitle")
    : t("viralFeed.silenceTitle");

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("viralFeed.closeSheet")}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.refBanner}>
          <Ionicons name="book-outline" size={14} color={colors.accent} />
          <Text style={styles.refText}>{verseReference}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {status === "loading" ? (
            <View style={styles.loader}>
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={styles.loaderText}>{t("viralFeed.generatingReflection")}</Text>
            </View>
          ) : status === "error" ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
              <Text style={styles.errorText}>{t("viralFeed.reflectionError")}</Text>
              <Pressable onPress={() => void fetchReflection()} style={styles.retryBtn}>
                <Text style={styles.retryText}>{t("common.tryAgain")}</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <View style={styles.accentBar} />
              <Text style={styles.reflectionText}>{displayText}</Text>
              {status === "done" ? (
                <Pressable
                  onPress={() => {
                    markReflectionComplete();
                    onClose();
                  }}
                  style={styles.doneBtn}
                >
                  <Text style={styles.doneBtnText}>{t("home.verseReflectionDone")}</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
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
  closeBtn: { padding: spacing.xs },
  headerTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
  refBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    justifyContent: "center",
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundElevated,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  refText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
  },
  body: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  loader: {
    flex: 1,
    alignItems: "center",
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  loaderText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  errorBox: {
    alignItems: "center",
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    marginTop: spacing.sm,
  },
  retryText: {
    ...typography.caption,
    color: colors.canvas,
    fontWeight: "700",
  },
  accentBar: {
    width: 40,
    height: 3,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    marginBottom: spacing.lg,
  },
  reflectionText: {
    ...typography.verse,
    color: colors.textPrimary,
    lineHeight: 34,
    letterSpacing: 0.15,
  },
  doneBtn: {
    marginTop: spacing.xl,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  doneBtnText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { formatBookReference, getBookDisplayName } from "@/i18n/bookNames";
import { useLocaleStore } from "@/store/localeStore";
import { useRouter } from "expo-router";
import { getCrossReferences } from "@/data/crossReferences";
import { colors, radii, spacing, typography } from "@/theme";

interface Props {
  bookSlug: string;
  chapter: number;
}

export function CrossReferencesPanel({ bookSlug, chapter }: Props) {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const crossRef = getCrossReferences(bookSlug, chapter);

  return (
    <View style={styles.container}>
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.header} hitSlop={8}>
        <Ionicons name="git-branch-outline" size={16} color={colors.accent} />
        <Text style={styles.headerText}>{t("reader.crossReferences")}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={colors.textMuted}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          {!crossRef || crossRef.related.length === 0 ? (
            <Text style={styles.emptyText}>{t("reader.noCrossRefs")}</Text>
          ) : (
            crossRef.related.map((ref) => (
              <Pressable
                key={`${ref.bookSlug}-${ref.chapter}`}
                onPress={() => router.push(`/reader/${ref.bookSlug}/${ref.chapter}`)}
                style={styles.refRow}
              >
                <View style={styles.refInfo}>
                  <Text style={styles.refTitle}>
                    {getBookDisplayName(ref.bookSlug, locale, ref.bookName)} {ref.chapter}
                  </Text>
                  <Text style={styles.refTheme}>{ref.theme}</Text>
                </View>
                <Ionicons name="arrow-forward" size={14} color={colors.accent} />
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.backgroundElevated,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  headerText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
    flex: 1,
  },
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
    paddingVertical: spacing.xs,
  },
  refRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
    gap: spacing.md,
  },
  refInfo: { flex: 1, gap: 2 },
  refTitle: { ...typography.body, color: colors.textPrimary, fontWeight: "700" },
  refTheme: { ...typography.caption, color: colors.textMuted },
});

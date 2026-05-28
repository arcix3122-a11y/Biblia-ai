import React, { useCallback, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import { colors, radii, spacing, typography } from "@/theme";

interface ReminderTimePickerProps {
  hour: number;
  minute: number;
  disabled?: boolean;
  onChange: (hour: number, minute: number) => void;
}

function toDate(hour: number, minute: number): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function ReminderTimePicker({
  hour,
  minute,
  disabled = false,
  onChange,
}: ReminderTimePickerProps) {
  const { t } = useAppTranslation();
  const [showPicker, setShowPicker] = useState(Platform.OS === "ios");

  const value = useMemo(() => toDate(hour, minute), [hour, minute]);
  const label = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  const handleChange = useCallback(
    (event: DateTimePickerEvent, selected?: Date) => {
      if (Platform.OS === "android") {
        setShowPicker(false);
      }
      if (event.type === "dismissed" || !selected) {
        return;
      }
      onChange(selected.getHours(), selected.getMinutes());
    },
    [onChange]
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{t("settings.pickReminderTime")}</Text>
      {Platform.OS === "android" ? (
        <Pressable
          onPress={() => !disabled && setShowPicker(true)}
          disabled={disabled}
          style={[styles.timeButton, disabled && styles.timeButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel={t("settings.pickReminderTime")}
        >
          <Text style={styles.timeText}>{label}</Text>
        </Pressable>
      ) : null}
      {(Platform.OS === "ios" || showPicker) && !disabled ? (
        <DateTimePicker
          value={value}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleChange}
          themeVariant="dark"
        />
      ) : null}
      {Platform.OS === "android" && disabled ? (
        <Text style={styles.timeText}>{label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
  },
  timeButton: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.inputBackground,
  },
  timeButtonDisabled: {
    opacity: 0.5,
  },
  timeText: {
    ...typography.subtitle,
    color: colors.accent,
    fontVariant: ["tabular-nums"],
  },
});

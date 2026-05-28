import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export async function hapticLight(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics unavailable on this device
  }
}

export async function hapticSelection(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  try {
    await Haptics.selectionAsync();
  } catch {
    // Haptics unavailable on this device
  }
}

export async function hapticSuccess(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Haptics unavailable on this device
  }
}

export async function hapticMedium(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Haptics unavailable on this device
  }
}

export async function hapticError(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // Haptics unavailable on this device
  }
}

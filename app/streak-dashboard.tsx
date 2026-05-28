import { Stack } from "expo-router";
import StreakDashboardScreen from "@/screens/StreakDashboardScreen";

export default function StreakDashboardRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StreakDashboardScreen />
    </>
  );
}

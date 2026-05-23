import { Stack } from "expo-router";
import StatsScreen from "@/screens/StatsScreen";

export default function StatsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatsScreen />
    </>
  );
}

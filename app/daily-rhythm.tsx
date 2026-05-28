import { Stack } from "expo-router";
import DailyRhythmScreen from "@/screens/DailyRhythmScreen";

export default function DailyRhythmRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <DailyRhythmScreen />
    </>
  );
}

import { Stack } from "expo-router";
import ReadingPlanScreen from "@/screens/ReadingPlanScreen";

export default function ReadingPlanRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ReadingPlanScreen />
    </>
  );
}

import { Stack } from "expo-router";
import VerseReviewScreen from "@/screens/VerseReviewScreen";

export default function ReviewRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <VerseReviewScreen />
    </>
  );
}

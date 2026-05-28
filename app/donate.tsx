import { Stack } from "expo-router";
import DonationScreen from "@/screens/DonationScreen";

export default function DonateRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <DonationScreen />
    </>
  );
}

import { useAppDeepLinks } from "@/hooks/useAppDeepLinks";

/** Must render inside expo-router context so incoming share URLs can navigate. */
export function AppDeepLinkBridge() {
  useAppDeepLinks();
  return null;
}

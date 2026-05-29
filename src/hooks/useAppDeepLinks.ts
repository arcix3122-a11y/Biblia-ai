import { useEffect } from "react";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { parseAppDeepLink, readerHref } from "@/utils/deepLinks";

function navigateFromDeepLink(url: string, router: ReturnType<typeof useRouter>): void {
  const target = parseAppDeepLink(url);
  if (!target) {
    return;
  }

  switch (target.type) {
    case "reader":
      router.push(readerHref(target.bookSlug, target.chapter, target.verse));
      break;
    case "invite":
      router.push("/(tabs)");
      break;
    case "streak":
      router.push("/stats");
      break;
    case "practice":
      router.push(`/practice/${target.practiceId}`);
      break;
    case "guided-prayer":
      router.push("/guided-prayer");
      break;
    default:
      break;
  }
}

/** Routes incoming biblia-ai:// and share landing URLs into the app stack. */
export function useAppDeepLinks(): void {
  const router = useRouter();

  useEffect(() => {
    const handleUrl = (url: string) => {
      navigateFromDeepLink(url, router);
    };

    void Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    const notificationSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === "string" && url) {
        handleUrl(url);
      }
    });

    return () => {
      subscription.remove();
      notificationSubscription.remove();
    };
  }, [router]);
}


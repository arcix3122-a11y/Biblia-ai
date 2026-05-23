import { useTranslation } from "react-i18next";
import type { SemanticTopic } from "@/data/semanticTopics";

export function useLocalizedTopic(topic: SemanticTopic | undefined) {
  const { t } = useTranslation();

  if (!topic) {
    return undefined;
  }

  return {
    ...topic,
    title: t(`topics.${topic.slug}.title`, { defaultValue: topic.title }),
    description: t(`topics.${topic.slug}.description`, { defaultValue: topic.description }),
  };
}

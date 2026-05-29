import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import { logError } from "@/services/errors/errorLogger";
import type { SelectedVerse } from "@/store/selectionStore";
import type { ScriptureTranslation, VerseWithReference } from "@/types/scripture";

export interface VerseTranslation {
  name: string;
  lang: "en" | "pl";
  text: string;
}

export interface InterlinearWord {
  original: string;
  transliteration: string;
  translation: string;
  strong: string;
}

export interface VerseStudyDetails {
  translations: VerseTranslation[];
  interlinear: InterlinearWord[];
  commentary: string[];
}

async function getLocalVerse(
  verse: SelectedVerse,
  translation: ScriptureTranslation
): Promise<VerseWithReference | null> {
  return scriptureRepo.getVerseByReference(
    verse.bookSlug,
    verse.chapter,
    verse.verse,
    translation
  );
}

function fallbackTextForTranslation(
  requested: ScriptureTranslation,
  selected: SelectedVerse,
  local: VerseWithReference | null
): string {
  if (local?.text) {
    return local.text;
  }

  if (requested === "en") {
    return selected.text;
  }

  return i18n.t("study.translationUnavailable");
}

async function buildLocalStudyData(verse: SelectedVerse): Promise<VerseStudyDetails> {
  const [english, polish, before, after] = await Promise.all([
    getLocalVerse(verse, "en"),
    getLocalVerse(verse, "pl"),
    scriptureRepo.getVerseByReference(verse.bookSlug, verse.chapter, verse.verse - 1, "en"),
    scriptureRepo.getVerseByReference(verse.bookSlug, verse.chapter, verse.verse + 1, "en"),
  ]);
  const reference = i18n.t("study.sourceReference", {
    book: verse.bookName,
    chapter: verse.chapter,
    verse: verse.verse,
    translation: i18n.t("settings.translation.enName"),
  });

  return {
    translations: [
      {
        name: i18n.t("settings.translation.enName"),
        lang: "en",
        text: fallbackTextForTranslation("en", verse, english),
      },
      {
        name: i18n.t("settings.translation.plName"),
        lang: "pl",
        text: fallbackTextForTranslation("pl", verse, polish),
      },
    ],
    interlinear: [
      {
        original: i18n.t("study.localOriginalUnavailable"),
        transliteration: i18n.t("study.localOriginalSource"),
        translation: i18n.t("study.localOriginalMeaning"),
        strong: i18n.t("study.localOriginalStrong"),
      },
    ],
    commentary: [
      i18n.t("study.localCommentaryReference", { reference }),
      i18n.t("study.localCommentaryContext", {
        before: before?.text ?? i18n.t("study.contextBoundaryBefore"),
        after: after?.text ?? i18n.t("study.contextBoundaryAfter"),
      }),
      i18n.t("study.localCommentaryPractice"),
    ],
  };
}

function hasRequiredStudyFields(details: VerseStudyDetails): boolean {
  return (
    Array.isArray(details.translations) &&
    Array.isArray(details.interlinear) &&
    Array.isArray(details.commentary)
  );
}

export function useVerseStudy() {
  const { t } = useTranslation();
  const [details, setDetails] = useState<VerseStudyDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudyDetails = useCallback(async (verse: SelectedVerse) => {
    setLoading(true);
    setError(null);

    const apiKey = process.env.EXPO_PUBLIC_AI_API_KEY?.trim();
    if (!apiKey) {
      setDetails(await buildLocalStudyData(verse));
      setLoading(false);
      return;
    }

    const prompt = `You are a scholarly Bible professor. Return a strict JSON object containing a study guide for ${verse.bookName} ${verse.chapter}:${verse.verse} ("${verse.text}").
Use KJV and Biblia Gdanska 1881 as the comparison translation labels unless the local text is unavailable.
JSON format:
{
  "translations": [
    {"name": "KJV", "lang": "en", "text": "English text"},
    {"name": "Biblia Gdanska 1881", "lang": "pl", "text": "Polish text or unavailable note"}
  ],
  "interlinear": [
    {"original": "Greek/Hebrew word", "transliteration": "Transliteration", "translation": "Literal meaning", "strong": "Strong number"}
  ],
  "commentary": [
    "Scholarly insight 1",
    "Scholarly insight 2",
    "Scholarly insight 3"
  ]
}
Do not return any other text, markdown wrapper, or formatting except the raw JSON.`;

    const endpoint =
      process.env.EXPO_PUBLIC_AI_API_URL?.trim() ||
      process.env.EXPO_PUBLIC_OPENAI_API_URL?.trim() ||
      "https://api.openai.com/v1/chat/completions";

    const model =
      process.env.EXPO_PUBLIC_AI_MODEL?.trim() ||
      process.env.EXPO_PUBLIC_OPENAI_MODEL?.trim() ||
      "gpt-4o-mini";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          max_tokens: 1000,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "You are a biblical scholar. Always reply in strict JSON format.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM study fetch failed with status ${response.status}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content?.trim();
      if (!rawContent) {
        throw new Error("Received empty content from LLM");
      }

      const parsed = JSON.parse(rawContent) as VerseStudyDetails;
      if (!hasRequiredStudyFields(parsed)) {
        throw new Error("JSON missing required schema fields");
      }

      setDetails(parsed);
    } catch (err: unknown) {
      logError(err, "verse-study-fetch-failed", { verse });
      setError(t("errors.studyFetchFailed"));
      setDetails(await buildLocalStudyData(verse));
    } finally {
      setLoading(false);
    }
  }, [t]);

  return {
    details,
    loading,
    error,
    fetchStudyDetails,
  };
}

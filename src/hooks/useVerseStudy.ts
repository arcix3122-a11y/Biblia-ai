import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { logError } from "@/services/errors/errorLogger";
import type { SelectedVerse } from "@/store/selectionStore";

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

const MOCK_STUDY_DATA: Record<string, VerseStudyDetails> = {
  "genesis-1-1": {
    translations: [
      { name: "ESV", lang: "en", text: "In the beginning, God created the heavens and the earth." },
      { name: "NIV", lang: "en", text: "In the beginning God created the heavens and the earth." },
      { name: "BT", lang: "pl", text: "Na początku Bóg stworzył niebo i ziemię." },
      { name: "UBG", lang: "pl", text: "Na początku Bóg stworzył niebo i ziemię." },
    ],
    interlinear: [
      { original: "בְּרֵאשִׁ֖ית", transliteration: "Bereshit", translation: "In the beginning", strong: "H7225" },
      { original: "בָּרָ֣א", transliteration: "Bara", translation: "created", strong: "H1254" },
      { original: "אֱלֹהִ֑ים", transliteration: "Elohim", translation: "God", strong: "H430" },
    ],
    commentary: [
      "Indicates the absolute beginning of time, space, and matter by a sovereign Creator.",
      "The plural name 'Elohim' hints at the majesty and triune nature of God.",
      "Establishes a foundational cosmic order separating the heavens (spiritual) and earth (physical)."
    ]
  },
  "psalms-23-1": {
    translations: [
      { name: "ESV", lang: "en", text: "The LORD is my shepherd; I shall not want." },
      { name: "NIV", lang: "en", text: "The LORD is my shepherd, I lack nothing." },
      { name: "BT", lang: "pl", text: "Pan jest moim pasterzem, nie brak mi niczego." },
      { name: "UBG", lang: "pl", text: "Pan jest moim pasterzem, niczego mi nie zabraknie." },
    ],
    interlinear: [
      { original: "יְהוָ֥ה", transliteration: "Yahweh", translation: "The LORD", strong: "H3068" },
      { original: "רֹ֝עִ֗י", transliteration: "Roi", translation: "my shepherd", strong: "H7462" },
      { original: "אֶחְסָֽר", transliteration: "Echsar", translation: "I shall want/lack", strong: "H2637" },
    ],
    commentary: [
      "Depicts an intimate covenant relationship using the ancient Near Eastern image of a protective shepherd.",
      "Declares absolute contentment and security under divine providence.",
      "Written by David, drawing from his own years as a humble shepherd in Judea."
    ]
  },
  "john-1-1": {
    translations: [
      { name: "ESV", lang: "en", text: "In the beginning was the Word, and the Word was with God, and the Word was God." },
      { name: "NIV", lang: "en", text: "In the beginning was the Word, and the Word was with God, and the Word was God." },
      { name: "BT", lang: "pl", text: "Na początku było Słowo, a Słowo było u Boga, i Bogiem było Słowo." },
      { name: "UBG", lang: "pl", text: "Na początku było Słowo, a Słowo było u Boga, i Bogiem było Słowo." },
    ],
    interlinear: [
      { original: "ἀρχῇ", transliteration: "Arche", translation: "beginning", strong: "G746" },
      { original: "λόγος", transliteration: "Logos", translation: "the Word", strong: "G3056" },
      { original: "Θεόν", transliteration: "Theon", translation: "God", strong: "G2316" },
    ],
    commentary: [
      "Directly echoes Genesis 1:1, establishing the pre-existence of Christ before creation.",
      "Uses 'Logos' to bridge Jewish theological thought (the creative Word of God) and Greek philosophy (cosmic reason).",
      "Asserts both the distinct personhood of the Word ('with God') and essential divinity ('was God')."
    ]
  },
  "romans-8-28": {
    translations: [
      { name: "ESV", lang: "en", text: "And we know that for those who love God all things work together for good, for those who are called according to his purpose." },
      { name: "NIV", lang: "en", text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose." },
      { name: "BT", lang: "pl", text: "Wiemy też, że Bóg z tymi, którzy Go miłują, współdziała we wszystkim dla ich dobra, z tymi, którzy są powołani według [Jego] zamiaru." },
      { name: "UBG", lang: "pl", text: "A wiemy, że wszystkim współdziała ku dobremu dla tych, którzy miłują Boga, to jest dla tych, którzy są powołani według jego postanowienia." },
    ],
    interlinear: [
      { original: "συνεργεῖ", transliteration: "Synergei", translation: "work together", strong: "G4903" },
      { original: "ἀγαθόν", transliteration: "Agathon", translation: "for good", strong: "G18" },
      { original: "πρόθεσιν", transliteration: "Prothesin", translation: "purpose / plan", strong: "G4286" },
    ],
    commentary: [
      "The verb 'synergei' indicates active divine weaving of both trials and triumphs for a holy resolution.",
      "Limits this promise to those who love God and are aligned with His redemptive decrees.",
      "Reassures believers that no event in their life is random or outside sovereign oversight."
    ]
  }
};

function buildGenericStudyData(verse: SelectedVerse): VerseStudyDetails {
  return {
    translations: [
      { name: "ESV", lang: "en", text: verse.text },
      { name: "NIV", lang: "en", text: verse.text },
      { name: "BT", lang: "pl", text: i18n.t("study.translationUnavailable") },
      { name: "UBG", lang: "pl", text: i18n.t("study.translationUnavailable") },
    ],
    interlinear: [
      { original: "Scripture", transliteration: verse.bookSlug, translation: "Chapter " + verse.chapter, strong: "Verse " + verse.verse },
    ],
    commentary: [
      i18n.t("study.offlineCommentary1"),
      i18n.t("study.offlineCommentary2"),
    ]
  };
}

export function useVerseStudy() {
  const { t } = useTranslation();
  const [details, setDetails] = useState<VerseStudyDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudyDetails = useCallback(async (verse: SelectedVerse) => {
    setLoading(true);
    setError(null);

    const slugKey = `${verse.bookSlug}-${verse.chapter}-${verse.verse}`;
    const mock = MOCK_STUDY_DATA[slugKey];

    // Try mock first for premium local experience
    if (mock) {
      setTimeout(() => {
        setDetails(mock);
        setLoading(false);
      }, 500);
      return;
    }

    const apiKey = process.env.EXPO_PUBLIC_AI_API_KEY?.trim();
    if (!apiKey) {
      // Local fallback if no key
      setTimeout(() => {
        setDetails(buildGenericStudyData(verse));
        setLoading(false);
      }, 400);
      return;
    }

    // Build the prompt for AI scholarly generation
    const prompt = `You are a scholarly Bible professor. Return a strict JSON object containing a deep study guide for ${verse.bookName} ${verse.chapter}:${verse.verse} ("${verse.text}").
JSON format:
{
  "translations": [
    {"name": "ESV", "lang": "en", "text": "English text"},
    {"name": "NIV", "lang": "en", "text": "English text"},
    {"name": "BT", "lang": "pl", "text": "Polish translation"},
    {"name": "UBG", "lang": "pl", "text": "Polish translation"}
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
            { role: "system", content: "You are a biblical scholar. Always reply in strict JSON format." },
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
      if (parsed.translations && parsed.interlinear && parsed.commentary) {
        setDetails(parsed);
      } else {
        throw new Error("JSON missing required schema fields");
      }
    } catch (err: any) {
      logError(err, "verse-study-fetch-failed", { verse });
      setError(t("errors.studyFetchFailed"));
      setDetails(buildGenericStudyData(verse));
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

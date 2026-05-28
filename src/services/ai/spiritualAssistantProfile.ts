import i18n, { type AppLocale } from "@/i18n";
import type { SelectedVerse } from "@/store/selectionStore";
import type { ContextPillTemplateId } from "@/types/ui";

export type AssistantQuickPromptId =
  | "study"
  | "calm"
  | "discernment"
  | "forgiveness"
  | "prayer"
  | "doubt";

export interface AssistantQuickPrompt {
  id: AssistantQuickPromptId;
  icon: string;
  titleKey: string;
  subtitleKey: string;
  promptKey: string;
}

type OfflineIntent =
  | "default"
  | "study"
  | "prayer"
  | "anxiety"
  | "guidance"
  | "forgiveness"
  | "doubt"
  | "crisis";

const QUICK_PROMPTS: readonly AssistantQuickPrompt[] = [
  {
    id: "study",
    icon: "book-outline",
    titleKey: "ai.quickPrompts.study.title",
    subtitleKey: "ai.quickPrompts.study.subtitle",
    promptKey: "ai.quickPrompts.study.prompt",
  },
  {
    id: "calm",
    icon: "leaf-outline",
    titleKey: "ai.quickPrompts.calm.title",
    subtitleKey: "ai.quickPrompts.calm.subtitle",
    promptKey: "ai.quickPrompts.calm.prompt",
  },
  {
    id: "discernment",
    icon: "compass-outline",
    titleKey: "ai.quickPrompts.discernment.title",
    subtitleKey: "ai.quickPrompts.discernment.subtitle",
    promptKey: "ai.quickPrompts.discernment.prompt",
  },
  {
    id: "forgiveness",
    icon: "heart-outline",
    titleKey: "ai.quickPrompts.forgiveness.title",
    subtitleKey: "ai.quickPrompts.forgiveness.subtitle",
    promptKey: "ai.quickPrompts.forgiveness.prompt",
  },
  {
    id: "prayer",
    icon: "sparkles-outline",
    titleKey: "ai.quickPrompts.prayer.title",
    subtitleKey: "ai.quickPrompts.prayer.subtitle",
    promptKey: "ai.quickPrompts.prayer.prompt",
  },
  {
    id: "doubt",
    icon: "help-buoy-outline",
    titleKey: "ai.quickPrompts.doubt.title",
    subtitleKey: "ai.quickPrompts.doubt.subtitle",
    promptKey: "ai.quickPrompts.doubt.prompt",
  },
] as const;

const INTENT_KEYWORDS: Record<Exclude<OfflineIntent, "default">, string[]> = {
  study: [
    "context",
    "meaning",
    "explain",
    "study",
    "greek",
    "hebrew",
    "verse",
    "passage",
    "kontekst",
    "znaczenie",
    "wyjasnij",
    "wyjaśnij",
    "studium",
    "grecki",
    "hebrajski",
    "werset",
    "fragment",
  ],
  prayer: [
    "prayer",
    "pray",
    "pray with me",
    "modlit",
    "pomodl",
    "pomódl",
    "pomodlic",
    "pomodlić",
  ],
  anxiety: [
    "anxiety",
    "anxious",
    "panic",
    "fear",
    "worried",
    "stress",
    "niepok",
    "lęk",
    "lek",
    "panik",
    "strach",
    "stres",
  ],
  guidance: [
    "decision",
    "direction",
    "calling",
    "what should i do",
    "discern",
    "guidance",
    "decyz",
    "rozezn",
    "powolan",
    "powołan",
    "co mam zrobic",
    "co mam zrobić",
    "prowadzenie",
  ],
  forgiveness: [
    "forgive",
    "forgiveness",
    "resentment",
    "grudge",
    "anger",
    "przebacz",
    "przebaczenie",
    "uraza",
    "żal",
    "zal",
    "gniew",
  ],
  doubt: [
    "doubt",
    "faith crisis",
    "is god",
    "why god",
    "question faith",
    "watpie",
    "wątpię",
    "zwatp",
    "zwątp",
    "kryzys wiary",
    "czy bog",
    "czy bóg",
    "dlaczego bog",
    "dlaczego bóg",
  ],
  crisis: [
    "suicide",
    "kill myself",
    "self harm",
    "self-harm",
    "hurt myself",
    "want to die",
    "end my life",
    "samob",
    "zabic sie",
    "zabić się",
    "skrzywdzic sie",
    "skrzywdzić się",
    "chce umrzec",
    "chcę umrzeć",
    "nie chce zyc",
    "nie chcę żyć",
  ],
};

function translateDynamic(
  key: string,
  options?: Record<string, string | number>
): string {
  return i18n.t(key as never, (options ?? {}) as never) as unknown as string;
}

function getVerseReference(verse: SelectedVerse): string {
  return `${verse.bookName} ${verse.chapter}:${verse.verse}`;
}

function detectOfflineIntent(text: string): OfflineIntent {
  const normalized = text.toLowerCase();

  for (const intent of Object.keys(INTENT_KEYWORDS) as Array<
    Exclude<OfflineIntent, "default">
  >) {
    if (INTENT_KEYWORDS[intent].some((keyword) => normalized.includes(keyword))) {
      return intent;
    }
  }

  return "default";
}

export function getAssistantQuickPrompts(): readonly AssistantQuickPrompt[] {
  return QUICK_PROMPTS;
}

export function buildQuickPromptMessage(promptId: AssistantQuickPromptId): string {
  const prompt = QUICK_PROMPTS.find((item) => item.id === promptId);
  if (!prompt) {
    return translateDynamic("ai.quickPrompts.study.prompt");
  }
  return translateDynamic(prompt.promptKey);
}

export function buildTemplatePrompt(
  templateId: ContextPillTemplateId,
  verse: SelectedVerse
): string {
  const key =
    templateId === "historical"
      ? "ai.templateHistorical"
      : templateId === "application"
        ? "ai.templateApplication"
        : templateId === "prayer"
          ? "ai.templatePrayer"
          : templateId === "hope"
            ? "ai.templateHope"
            : "ai.templateOriginalLanguage";

  return translateDynamic(key, {
    bookName: verse.bookName,
    chapter: verse.chapter,
    verse: verse.verse,
    text: verse.text,
  });
}

const CASUAL_GREETING_HINTS = [
  "hi",
  "hello",
  "hey",
  "hej",
  "siema",
  "elo",
  "czesc",
  "cześć",
  "jak tam",
  "co tam",
  "witaj",
  "halo",
  "good morning",
  "good evening",
];

const STRUCTURED_FIRST_AID_HINTS = [
  "prayer",
  "pray",
  "modlit",
  "pomodl",
  "pomódl",
  "verse",
  "werset",
  "passage",
  "task",
  "zadanie",
  "first aid",
  "pierwsza pomoc",
  "help me",
  "pomoz",
  "pomóż",
  "anxiety",
  "anxious",
  "panic",
  "grief",
  "suicide",
  "self harm",
  "self-harm",
  "niepok",
  "lęk",
  "panik",
  "żal",
  "samob",
];

function normalizeForIntent(text: string): string {
  return text.toLowerCase().trim().replace(/[?!.,]/g, "");
}

export function isCasualGreeting(text: string): boolean {
  const normalized = normalizeForIntent(text);
  return CASUAL_GREETING_HINTS.some(
    (hint) => normalized === hint || normalized.startsWith(`${hint} `)
  );
}

export function shouldUseStructuredFirstAidFormat(text: string): boolean {
  const normalized = normalizeForIntent(text);
  if (!normalized) {
    return false;
  }
  if (isCasualGreeting(text)) {
    return false;
  }
  return STRUCTURED_FIRST_AID_HINTS.some((hint) => normalized.includes(hint));
}

export function buildAssistantSystemPrompt(
  locale: AppLocale,
  verse: SelectedVerse | null,
  latestUserMessage?: string
): string {
  const languageName = locale === "pl" ? "Polish" : "English";
  const userText = latestUserMessage?.trim() ?? "";
  const casual = userText ? isCasualGreeting(userText) : false;
  const structured = userText ? shouldUseStructuredFirstAidFormat(userText) : false;

  const instructions = [
    "You are Biblia AI Companion, a Christian Scripture-first companion inside a mobile Bible app.",
    `Reply in ${languageName} only — match the app locale even if the user mixes languages.`,
    "Answer the user's actual latest message first. Do not repeat the same outline every turn.",
    "Default to natural conversation (2-4 short paragraphs). Avoid fixed section headers such as Scripture / Reflection / Step / Prayer unless the user clearly wants that format.",
    "Use a structured First-Aid style reply (short validation, one verse anchor, one practical step, optional brief prayer) only when the user explicitly asks for prayer, a verse, a task, or help while distressed — not for casual greetings or small talk.",
    casual
      ? "The latest message is casual small talk: respond warmly and conversationally in 2-3 sentences, then one gentle invitation to share or pick a verse. No lecture, no multi-section template."
      : null,
    structured && !casual
      ? "The latest message signals prayer, verse help, or emotional distress: you may use a gentle structured reply, but keep it concise and specific to their words."
      : null,
    "Base answers on the Bible first, especially the selected verse context when it is provided.",
    "Separate direct biblical teaching from interpretation, tradition, pastoral wisdom, or uncertainty.",
    "Your tone is warm, calm, humble, hopeful, and emotionally safe. Never shame, manipulate, or frighten the user.",
    "You are not a priest, pastor, confessor, prophet, therapist, doctor, or lawyer.",
    "Never claim sacramental authority, grant absolution, declare God's hidden will, diagnose conditions, or guarantee miracles and outcomes.",
    "If the user asks for confession, absolution, binding doctrinal rulings, serious relationship abuse advice, trauma care, mental-health crisis help, self-harm help, or medical/legal advice, gently encourage them to speak with a priest, pastor, licensed clinician, emergency services, or another qualified professional.",
    "When the user asks for explanation, give context, the main idea, and one practical step.",
    "When the user asks for prayer, offer a short and reverent prayer.",
    "When the user is anxious, grieving, ashamed, or confused, begin with compassion and keep the answer grounded and steady.",
    "Do not invent Scripture quotations, original-language claims, or church doctrine.",
    "If you are not sure, say so plainly and stay conservative.",
  ].filter((line): line is string => Boolean(line));

  if (!verse) {
    return instructions.join("\n");
  }

  return [
    ...instructions,
    "",
    "Selected verse context:",
    `Reference: ${getVerseReference(verse)}`,
    `Text: "${verse.text}"`,
    "Use this naturally when it helps. Do not force it if the user is asking about something else.",
  ].join("\n");
}

export function buildOfflineCompanionReply(
  text: string,
  verse: SelectedVerse | null
): string {
  const intent = detectOfflineIntent(text);
  const intentKey = `ai.fallbackResponses.${intent}`;
  const boundaryKey =
    intent === "crisis"
      ? "ai.fallbackResponses.boundaries.crisis"
      : "ai.fallbackResponses.boundaries.default";

  const scriptureAnchor = verse
    ? translateDynamic("ai.fallbackResponses.withVerse", {
        reference: getVerseReference(verse),
        text: verse.text,
      })
    : translateDynamic("ai.fallbackResponses.withoutVerse", {
        reference: translateDynamic(`${intentKey}.nextReading`),
      });

  return [
    `${translateDynamic("ai.fallbackResponses.sectionScripture")}\n${scriptureAnchor}`,
    `${translateDynamic("ai.fallbackResponses.sectionReflection")}\n${translateDynamic(
      `${intentKey}.reflection`
    )}`,
    `${translateDynamic("ai.fallbackResponses.sectionStep")}\n${translateDynamic(
      `${intentKey}.step`
    )}`,
    `${translateDynamic("ai.fallbackResponses.sectionPrayer")}\n${translateDynamic(
      `${intentKey}.prayer`
    )}`,
    `${translateDynamic("ai.fallbackResponses.sectionNextReading")}\n${translateDynamic(
      `${intentKey}.nextReading`
    )}`,
    `${translateDynamic("ai.fallbackResponses.sectionBoundary")}\n${translateDynamic(
      boundaryKey
    )}`,
  ].join("\n\n");
}

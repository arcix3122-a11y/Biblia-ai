import { callLiveChatCompletion, hasLlmApiKey } from "@/services/ai/llmClient";
import { logError } from "@/services/errors/errorLogger";
import {
  getBookBySlug,
  getVersesByBookAndChapter,
} from "@/services/db/scriptureRepository";
import type { AppLocale } from "@/i18n";
import type { VerseWithReference } from "@/types/scripture";
import {
  resolveSpiritualFirstAidCategory,
  type SpiritualFirstAidCategory,
  type SpiritualVerseReference,
} from "@/data/spiritualFirstAidKit";
import type { SelectedVerse } from "@/store/selectionStore";

export interface SpiritualFirstAidKitResult {
  problem: string;
  category: SpiritualFirstAidCategory;
  verses: VerseWithReference[];
  commentary: string;
  usedLiveApi: boolean;
}

export interface SpiritualFirstAidKitOptions {
  locale?: AppLocale;
  translation?: "en" | "pl";
  maxTokens?: number;
  verse?: SelectedVerse | null;
}

const DEFAULT_MAX_TOKENS = 320;
const DEFAULT_TRANSLATION = "en" as const;
const CHAPTER_CACHE = new Map<string, Promise<VerseWithReference[]>>();

function formatCitation(verse: VerseWithReference): string {
  return `${verse.book_name} ${verse.chapter_number}:${verse.number}`;
}

function normalizeProblem(problem: string): string {
  return problem.trim().replace(/\s+/g, " ");
}

function buildSystemPrompt(locale: AppLocale, category: SpiritualFirstAidCategory): string {
  const languageName = locale === "pl" ? "Polish" : "English";

  return [
    "You are Spiritual First-Aid Kit, a Scripture-first mobile assistant.",
    `Reply in ${languageName}.`,
    "Your job is to give modern, psychologically aware, emotionally safe support grounded in the supplied verses.",
    "Do not invent doctrine, medical advice, legal advice, or unverifiable claims.",
    "Do not shame the user, over-spiritualize pain, or promise outcomes.",
    "Prefer concise, supportive language with one concrete next step.",
    "Use the verses as anchors, but do not quote more than one short phrase verbatim.",
    "If the message suggests self-harm, abuse, or imminent danger, encourage immediate human help and emergency services.",
    "Preferred output: 3 short paragraphs or 3 bullets plus a one-line prayer or grounding line.",
    `Theme: ${category.title}.`,
  ].join("\n");
}

function buildUserPrompt(problem: string, category: SpiritualFirstAidCategory, verses: VerseWithReference[]): string {
  const verseBlock = verses
    .map((verse, index) => `${index + 1}. ${formatCitation(verse)} — ${verse.text}`)
    .join("\n");

  return [
    `User problem: ${problem}`,
    `Category: ${category.title}`,
    "Task: write a short supportive commentary for a person who feels stuck, overwhelmed, or emotionally overloaded.",
    "Include: validation, what the verses say psychologically/spiritually, and one practical next step.",
    "Avoid: preachy language, overexplaining, and long introductions.",
    "Verses:",
    verseBlock,
  ].join("\n");
}

function buildGreetingOfflineReply(locale: AppLocale): string {
  if (locale === "pl") {
    return [
      `**Pokój z Tobą! Cieszę się, że tu jesteś.**`,
      `Jestem Twoim duchowym towarzyszem, gotowym wspierać Cię w codziennej modlitwie, studium Słowa Bożego oraz rozeznawaniu duchowym.`,
      `Możesz zapytać mnie o dowolny fragment Pisma Świętego, poprosić o pomoc w ułożeniu osobistej modlitwy lub podzielić się tym, co dziś trapi Twoje serce.`,
      `**Jak najlepiej zacząć?**\n📖 Wybierz dowolny werset w Czytniku (zakładka **„Czytaj”**), a po powrocie do czatu zobaczysz u góry aktywny werset z gotowymi podpowiedziami do modlitwy lub studium!`,
      `Co chciałbyś dziś przynieść przed oblicze Boga i Jego Słowa? Śmiało, napisz poniżej.`
    ].join("\n\n");
  }

  return [
    `**Peace be with you! I am glad you are here.**`,
    `I am your spiritual companion, ready to support you in daily prayer, studying Holy Scripture, and spiritual discernment.`,
    `You can ask me about any passage of Scripture, request help in shaping a personal prayer, or share whatever is weighing on your heart today.`,
    `**Best way to start?**\n📖 Select any verse in the Reader (**"Read"** tab), and when you return to the chat, you will see the active verse at the top with ready-made prompts for prayer or study!`,
    `What would you like to bring before God and His Word today? Feel free to write below.`
  ].join("\n\n");
}

function buildVerseSpecificOfflineReply(
  problem: string,
  verse: SelectedVerse,
  locale: AppLocale
): string {
  const reference = `${verse.bookName} ${verse.chapter}:${verse.verse}`;
  const text = verse.text;

  // Let's detect user intent
  const normProblem = problem.toLowerCase();
  const isPrayerRequest = normProblem.includes("modl") || normProblem.includes("pray") || normProblem.includes("pillprayer");
  const isStudyRequest = normProblem.includes("sens") || normProblem.includes("zrozum") || normProblem.includes("stud") || normProblem.includes("context") || normProblem.includes("pillhistorical") || normProblem.includes("pilloriginallanguage");

  if (locale === "pl") {
    let reflection = "";
    let step = "";
    let prayer = "";

    if (isPrayerRequest) {
      reflection = `Wkraczasz w modlitwę opartą na słowach Pisma Świętego. Ten fragment z **${reference}** zaprasza nas do postawienia Boga w centrum naszych dzisiejszych spraw. Rozważanie Słowa i zamiana go w modlitwę to starożytna praktyka Kościoła (Lectio Divina), która wycisza serce i napełnia je pokojem.`;
      step = `Przeczytaj werset powoli trzy razy. Przy każdym czytaniu połóż nacisk na inne słowo. Wypowiedz cicho to słowo, które najbardziej rezonuje z Twoją obecną sytuacją.`;
      prayer = `*Panie Jezu, dziękuję Ci za Twoje żywe Słowo w ${reference}: „${text}”. Niech ta prawda przeniknie moje myśli i uczucia. Oddaję Ci ten dzień i proszę, prowadź mnie w swojej łasce. Amen.*`;
    } else if (isStudyRequest) {
      reflection = `Zaczynasz głębsze studium fragmentu **${reference}**. Aby w pełni pojąć ten werset, warto zatrzymać się nad jego szerszym kontekstem literackim i historycznym. Słowo Boże bada nasze serca, a rzetelne poznanie prawdy chroni nas przed pośpiechem i lękiem.`;
      step = `Otwórz ten fragment w Czytniku. Przeczytaj cały rozdział ${verse.chapter}, zwracając szczególną uwagę na wersety przed i po tym fragmencie. Zapisz w notatniku jedną rzecz, która Cię zaskoczyła.`;
      prayer = `*Boże prawdy, ześlij swojego Ducha, aby oświecił mój umysł podczas lektury ${reference}. Daj mi pokorę i mądrość, bym nie tylko rozumiał Twoje Słowo, ale nim żył na co dzień. Amen.*`;
    } else {
      reflection = `Słowo Boże z **${reference}** przynosi dziś światło do Twojego serca. Gdy stajemy w obecności Słowa: „${text}”, każda nasza troska i niepokój mogą zostać złożone u stóp Chrystusa. Słowo to nie jest martwą literą, ale żywą obietnicą bliskości Boga.`;
      step = `Zatrzymaj się na 60 sekund w ciszy. Pomyśl o jednej konkretnej sytuacji z dzisiejszego dnia, w której możesz zastosować obietnicę lub wezwanie zawarte w tym wsecie.`;
      prayer = `*Ojcze niebieski, dziękuję za werset ${reference}, który dziś do mnie kierujesz. Uspokój moje serce i pomóż mi ufać Twojej obecności w każdej godzinie. Amen.*`;
    }

    return [
      `Rozważasz werset: **${reference}**\n*„${text}”*`,
      `**Refleksja:** ${reflection}`,
      `**Zadanie dla serca:** ${step}`,
      `**Modlitwa:** ${prayer}`
    ].join("\n\n");
  }

  // English fallback
  let reflection = "";
  let step = "";
  let prayer = "";

  if (isPrayerRequest) {
    reflection = `You are entering into a prayer rooted in the words of Holy Scripture. This passage from **${reference}** invites us to place God at the center of our daily concerns. Turning Scripture into prayer is an ancient practice that silences the heart and fills it with peace.`;
    step = `Read the verse slowly three times. With each reading, emphasize a different word. Quietly speak the word that resonates most with your current situation.`;
    prayer = `*Lord Jesus, thank You for Your living Word in ${reference}: "${text}". May this truth permeate my thoughts and feelings. I give You this day and ask You to guide me in Your grace. Amen.*`;
  } else if (isStudyRequest) {
    reflection = `You are starting a deeper study of **${reference}**. To fully comprehend this verse, it is helpful to pause over its broader literary and historical context. The Word of God searches our hearts, and a diligent understanding of truth protects us from hurry and fear.`;
    step = `Open this passage in the Reader. Read the whole chapter ${verse.chapter}, paying special attention to the verses before and after. Write down one thing that surprised you in your notebook.`;
    prayer = `*God of truth, send Your Spirit to enlighten my mind as I read ${reference}. Give me humility and wisdom to not only understand Your Word but to live it daily. Amen.*`;
  } else {
    reflection = `The Word of God from **${reference}** brings light to your heart today. When we stand in the presence of the Word: "${text}", all our worries and anxieties can be laid at the feet of Christ. This Word is not a dead letter, but a living promise of God's nearness.`;
    step = `Pause for 60 seconds in silence. Think of one specific situation today where you can apply the promise or calling found in this verse.`;
    prayer = `*Heavenly Father, thank You for the verse ${reference} that You direct to me today. Quiet my heart and help me trust Your presence in every hour. Amen.*`;
  }

  return [
    `Meditating on: **${reference}**\n*"${text}"*`,
    `**Reflection:** ${reflection}`,
    `**Heart Exercise:** ${step}`,
    `**Prayer:** ${prayer}`
  ].join("\n\n");
}

function buildOfflineReply(
  problem: string,
  category: SpiritualFirstAidCategory,
  verses: VerseWithReference[],
  locale: AppLocale
): string {
  const citations = verses.map(formatCitation).join(" • ");

  if (locale === "pl") {
    const categoryTitlePl =
      category.id === "anxiety" ? "Lęk i niepokój" :
      category.id === "burnout" ? "Wypalenie i zmęczenie" :
      category.id === "finances" ? "Troski finansowe" :
      category.id === "relationships" ? "Trudności w relacjach" :
      category.id === "grief" ? "Strata i żałoba" :
      category.id === "guilt" ? "Wstyd i poczucie winy" :
      category.id === "guidance" ? "Poszukiwanie kierunku" :
      category.id === "loneliness" ? "Samotność" :
      category.id === "doubt" ? "Wątpliwości i kryzys wiary" : "Troski serca";

    return [
      `To, co teraz przeżywasz, dotyka obszaru: **${categoryTitlePl}**. Odczuwanie ciężaru lub presji jest w pełni ludzkim i ważnym doświadczeniem — nie musisz nieść tego w pojedynkę.`,
      `Słowo Boże wskazuje nam ten sam kierunek: Bóg jest blisko Twojego serca. Nie musisz rozwiązywać wszystkiego natychmiast, a kolejny mały krok wykonany w zaufaniu znaczy więcej niż lęk.`,
      `**Słowo dla Ciebie na dziś (znajdziesz w czytniku):**\n📖 ${citations}`,
      `**Zadanie dla serca:** Zatrzymaj się na 60 sekund. Nazwij swój niepokój jednym szarym, szczerym zdaniem przed Bogiem i wykonaj najprostszą mądrą rzecz, jaka jest możliwa w tej godzinie.`,
      `**Modlitwa:** *Panie, Ty znasz moje serce i to, co je trapi: „${problem}”. Wycisz mój niepokój, udziel mi mądrości Ducha Świętego i poprowadź przez kolejny wierny krok. Amen.*`
    ].join("\n\n");
  }

  return [
    `What you are carrying fits the **${category.title}** area: real pressure, real emotion, and a real need for steadiness. Feeling overwhelmed is a valid human experience — you don't have to carry it alone.`,
    `Holy Scripture points us in the same direction: God is close to the brokenhearted. You do not need to solve everything at once, and the next small step taken in faith matters more than panic.`,
    `**Word for Today (available in reader):**\n📖 ${citations}`,
    `**Heart Exercise:** Pause for 60 seconds. Name the problem in one honest sentence before God, and take the smallest wise action available to you in this hour.`,
    `**Prayer:** *Lord, You know my heart and what troubles it: "${problem}". Calm my anxiety, give me the clarity of Your Holy Spirit, and help me with the next right step. Amen.*`
  ].join("\n\n");
}

async function loadVerse(reference: SpiritualVerseReference, translation: "en" | "pl"): Promise<VerseWithReference | null> {
  const book = await getBookBySlug(reference.bookSlug);
  if (!book) {
    return null;
  }

  const verses = await getVersesByBookAndChapter(book.id, reference.chapter, translation);
  const verse = verses.find((item) => item.number === reference.verse);
  if (!verse) {
    return null;
  }

  return {
    ...verse,
    book_id: book.id,
    book_name: book.name,
    book_slug: book.slug,
    chapter_number: reference.chapter,
  };
}

function getVerseCacheKey(reference: SpiritualVerseReference, translation: "en" | "pl"): string {
  return `${translation}:${reference.bookSlug}:${reference.chapter}`;
}

async function loadChapterVerses(
  reference: SpiritualVerseReference,
  translation: "en" | "pl"
): Promise<VerseWithReference[]> {
  const cacheKey = getVerseCacheKey(reference, translation);
  const cached = CHAPTER_CACHE.get(cacheKey);

  if (cached) {
    return cached;
  }

  const promise = (async () => {
    const book = await getBookBySlug(reference.bookSlug);
    if (!book) {
      return [];
    }

    const verses = await getVersesByBookAndChapter(book.id, reference.chapter, translation);
    return verses.map((verse) => ({
      ...verse,
      book_id: book.id,
      book_name: book.name,
      book_slug: book.slug,
      chapter_number: reference.chapter,
    }));
  })();

  CHAPTER_CACHE.set(cacheKey, promise);
  return promise;
}

async function loadCuratedVerses(
  category: SpiritualFirstAidCategory,
  translation: "en" | "pl"
): Promise<VerseWithReference[]> {
  const versePromises = category.verseRefs.map(async (reference) => {
    const chapterVerses = await loadChapterVerses(reference, translation);
    return chapterVerses.find((verse) => verse.number === reference.verse) ?? (await loadVerse(reference, translation));
  });

  const verses = await Promise.all(versePromises);
  return verses.filter((verse): verse is VerseWithReference => Boolean(verse));
}

export async function generateSpiritualFirstAidKit(
  userEmotionOrProblem: string,
  options: SpiritualFirstAidKitOptions = {}
): Promise<SpiritualFirstAidKitResult> {
  const problem = normalizeProblem(userEmotionOrProblem);
  if (!problem) {
    throw new Error("userEmotionOrProblem is required");
  }

  const locale = options.locale ?? "en";
  const translation = options.translation ?? DEFAULT_TRANSLATION;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const category = resolveSpiritualFirstAidCategory(problem);
  const verses = await loadCuratedVerses(category, translation);

  if (verses.length === 0) {
    throw new Error(`No curated verses found for category: ${category.id}`);
  }

  if (!hasLlmApiKey()) {
    if (options.verse) {
      return {
        problem,
        category,
        verses,
        commentary: buildVerseSpecificOfflineReply(problem, options.verse, locale),
        usedLiveApi: false,
      };
    }

    const GREETINGS = [
      "hi", "hello", "hey", "hej", "siema", "czesc", "cześć", "jak tam", "co tam",
      "dzień dobry", "dzien dobry", "witaj", "witajcie", "halo", "welcome", "good morning", "good evening"
    ];
    const normalized = problem.toLowerCase().trim().replace(/[?!.,]/g, "");
    const isGreeting = GREETINGS.some(g => normalized === g || normalized.startsWith(g + " "));
    if (isGreeting) {
      return {
        problem,
        category,
        verses,
        commentary: buildGreetingOfflineReply(locale),
        usedLiveApi: false,
      };
    }

    return {
      problem,
      category,
      verses,
      commentary: buildOfflineReply(problem, category, verses, locale),
      usedLiveApi: false,
    };
  }

  try {
    const commentary = await callLiveChatCompletion(
      [
        { role: "system", content: buildSystemPrompt(locale, category) },
        { role: "user", content: buildUserPrompt(problem, category, verses) },
      ],
      {
        maxTokens,
        temperature: 0.7,
        topP: 0.9,
        presencePenalty: 0.3,
        frequencyPenalty: 0.2,
        seed: Date.now() % 1_000_000_000,
      }
    );

    return {
      problem,
      category,
      verses,
      commentary,
      usedLiveApi: true,
    };
  } catch (error) {
    logError(error, "spiritual-first-aid-kit-live", {
      locale,
      category: category.id,
      verseCount: verses.length,
      hasApiKey: true,
    });

    if (options.verse) {
      return {
        problem,
        category,
        verses,
        commentary: buildVerseSpecificOfflineReply(problem, options.verse, locale),
        usedLiveApi: false,
      };
    }

    const GREETINGS = [
      "hi", "hello", "hey", "hej", "siema", "czesc", "cześć", "jak tam", "co tam",
      "dzień dobry", "dzien dobry", "witaj", "witajcie", "halo", "welcome", "good morning", "good evening"
    ];
    const normalized = problem.toLowerCase().trim().replace(/[?!.,]/g, "");
    const isGreeting = GREETINGS.some(g => normalized === g || normalized.startsWith(g + " "));
    if (isGreeting) {
      return {
        problem,
        category,
        verses,
        commentary: buildGreetingOfflineReply(locale),
        usedLiveApi: false,
      };
    }

    return {
      problem,
      category,
      verses,
      commentary: buildOfflineReply(problem, category, verses, locale),
      usedLiveApi: false,
    };
  }
}
export type SpiritualFirstAidCategoryId =
  | "anxiety"
  | "burnout"
  | "finances"
  | "relationships"
  | "grief"
  | "guilt"
  | "guidance"
  | "loneliness"
  | "doubt";

export interface SpiritualVerseReference {
  bookSlug: string;
  chapter: number;
  verse: number;
}

export interface SpiritualFirstAidCategory {
  id: SpiritualFirstAidCategoryId;
  title: string;
  aliases: readonly string[];
  verseRefs: readonly SpiritualVerseReference[];
}

export const SPIRITUAL_FIRST_AID_CATEGORIES: readonly SpiritualFirstAidCategory[] = [
  {
    id: "anxiety",
    title: "Anxiety",
    aliases: ["anxiety", "stress", "stres", "lęk", "lek", "panic", "fear", "worry", "niepokoj", "overwhelm"],
    verseRefs: [
      { bookSlug: "matthew", chapter: 6, verse: 34 },
      { bookSlug: "philippians", chapter: 4, verse: 6 },
      { bookSlug: "1-peter", chapter: 5, verse: 7 },
    ],
  },
  {
    id: "burnout",
    title: "Burnout",
    aliases: ["burnout", "wypalen", "praca", "work", "job", "office", "zmeczenie", "zmęczenie", "presja", "deadline"],
    verseRefs: [
      { bookSlug: "colossians", chapter: 3, verse: 23 },
      { bookSlug: "matthew", chapter: 11, verse: 28 },
      { bookSlug: "galatians", chapter: 6, verse: 9 },
    ],
  },
  {
    id: "finances",
    title: "Finances",
    aliases: ["finances", "money", "debt", "bills", "rent", "finanse", "pieniadze", "pieniądze", "dlug", "dług", "rachunki"],
    verseRefs: [
      { bookSlug: "matthew", chapter: 6, verse: 33 },
      { bookSlug: "philippians", chapter: 4, verse: 19 },
      { bookSlug: "psalms", chapter: 37, verse: 25 },
    ],
  },
  {
    id: "relationships",
    title: "Relationships",
    aliases: ["relationship", "relationships", "marriage", "partner", "związek", "zwiazek", "relacja", "kłótnia", "klotnia", "conflict", "fight"],
    verseRefs: [
      { bookSlug: "ephesians", chapter: 4, verse: 32 },
      { bookSlug: "1-corinthians", chapter: 13, verse: 4 },
      { bookSlug: "romans", chapter: 12, verse: 18 },
    ],
  },
  {
    id: "grief",
    title: "Grief",
    aliases: ["grief", "loss", "death", "mourning", "smutek", "żałoba", "zaloba", "strata"],
    verseRefs: [
      { bookSlug: "psalms", chapter: 34, verse: 18 },
      { bookSlug: "john", chapter: 14, verse: 1 },
      { bookSlug: "revelation", chapter: 21, verse: 4 },
    ],
  },
  {
    id: "guilt",
    title: "Guilt",
    aliases: ["guilt", "shame", "sin", "failure", "wina", "wstyd", "poczucie winy"],
    verseRefs: [
      { bookSlug: "romans", chapter: 8, verse: 1 },
      { bookSlug: "1-john", chapter: 1, verse: 9 },
      { bookSlug: "psalms", chapter: 51, verse: 10 },
    ],
  },
  {
    id: "guidance",
    title: "Guidance",
    aliases: ["guidance", "decision", "direction", "choose", "discern", "decyz", "rozezn", "what should i do", "co mam zrobic", "co mam zrobić"],
    verseRefs: [
      { bookSlug: "proverbs", chapter: 3, verse: 5 },
      { bookSlug: "james", chapter: 1, verse: 5 },
      { bookSlug: "psalms", chapter: 32, verse: 8 },
    ],
  },
  {
    id: "loneliness",
    title: "Loneliness",
    aliases: ["lonely", "alone", "isolated", "samotn", "samotny", "odrzucony", "abandoned"],
    verseRefs: [
      { bookSlug: "isaiah", chapter: 41, verse: 10 },
      { bookSlug: "hebrews", chapter: 13, verse: 5 },
      { bookSlug: "matthew", chapter: 28, verse: 20 },
    ],
  },
  {
    id: "doubt",
    title: "Doubt",
    aliases: ["doubt", "faith", "question god", "kryzys wiary", "wątpi", "watpie", "zwatp", "zwątp", "uncertain"],
    verseRefs: [
      { bookSlug: "mark", chapter: 9, verse: 24 },
      { bookSlug: "john", chapter: 20, verse: 27 },
      { bookSlug: "jude", chapter: 1, verse: 22 },
    ],
  },
] as const;

const DEFAULT_CATEGORY_ID: SpiritualFirstAidCategoryId = "guidance";

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function scoreCategory(input: string, category: SpiritualFirstAidCategory): number {
  let score = 0;

  for (const alias of category.aliases) {
    if (input.includes(normalizeText(alias))) {
      score += alias.length > 10 ? 2 : 1;
    }
  }

  if (input.includes(category.id)) {
    score += 2;
  }

  return score;
}

export function resolveSpiritualFirstAidCategory(
  userEmotionOrProblem: string
): SpiritualFirstAidCategory {
  const normalized = normalizeText(userEmotionOrProblem);

  let bestMatch = SPIRITUAL_FIRST_AID_CATEGORIES.find((category) => category.id === DEFAULT_CATEGORY_ID) ?? SPIRITUAL_FIRST_AID_CATEGORIES[0];
  let bestScore = -1;

  for (const category of SPIRITUAL_FIRST_AID_CATEGORIES) {
    const score = scoreCategory(normalized, category);
    if (score > bestScore) {
      bestMatch = category;
      bestScore = score;
    }
  }

  return bestScore > 0 ? bestMatch : (SPIRITUAL_FIRST_AID_CATEGORIES.find((category) => category.id === DEFAULT_CATEGORY_ID) ?? bestMatch);
}
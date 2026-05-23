export interface TopicVerseRef {
  bookSlug: string;
  chapter: number;
}

export interface SemanticTopic {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  verseRefs?: TopicVerseRef[];
}

export const SEMANTIC_TOPICS: readonly SemanticTopic[] = [
  {
    slug: "anxiety",
    title: "Anxiety",
    description: "Peace, courage, and trust in uncertainty",
    keywords: ["fear", "anxious", "worry", "peace", "trouble", "heart", "cast"],
    verseRefs: [{ bookSlug: "psalms", chapter: 23 }, { bookSlug: "romans", chapter: 8 }],
  },
  {
    slug: "gratitude",
    title: "Gratitude",
    description: "Thanksgiving and praise",
    keywords: ["thanks", "thankful", "praise", "bless", "grateful", "rejoice"],
    verseRefs: [{ bookSlug: "psalms", chapter: 23 }],
  },
  {
    slug: "leadership",
    title: "Leadership",
    description: "Servant leadership and wisdom",
    keywords: ["lead", "shepherd", "servant", "wisdom", "guide", "rule"],
    verseRefs: [{ bookSlug: "genesis", chapter: 1 }],
  },
  {
    slug: "focus",
    title: "Focus",
    description: "Single-minded purpose and discipline",
    keywords: ["seek", "first", "mind", "set", "fix", "eyes", "run"],
    verseRefs: [{ bookSlug: "john", chapter: 1 }],
  },
  {
    slug: "hope",
    title: "Hope",
    description: "Future anchored in God's promises",
    keywords: ["hope", "wait", "renew", "strength", "glory", "promise"],
    verseRefs: [{ bookSlug: "romans", chapter: 8 }],
  },
  {
    slug: "forgiveness",
    title: "Forgiveness",
    description: "Mercy, reconciliation, and grace",
    keywords: ["forgive", "mercy", "pardon", "reconcile", "trespass"],
    verseRefs: [{ bookSlug: "john", chapter: 1 }],
  },
  {
    slug: "strength",
    title: "Strength",
    description: "Power made perfect in weakness",
    keywords: ["strength", "weak", "power", "mighty", "endure", "overcome"],
    verseRefs: [{ bookSlug: "romans", chapter: 8 }],
  },
  {
    slug: "prayer",
    title: "Prayer",
    description: "Communion with God through prayer",
    keywords: ["prayer", "pray", "supplication", "intercede", "petition", "ask", "seek", "knock"],
    verseRefs: [{ bookSlug: "matthew", chapter: 6 }, { bookSlug: "philippians", chapter: 4 }, { bookSlug: "james", chapter: 5 }],
  },
  {
    slug: "wisdom",
    title: "Wisdom",
    description: "Godly wisdom and discernment",
    keywords: ["wisdom", "wise", "knowledge", "understanding", "discern", "insight", "prudent"],
    verseRefs: [{ bookSlug: "proverbs", chapter: 3 }, { bookSlug: "james", chapter: 1 }, { bookSlug: "psalms", chapter: 111 }],
  },
  {
    slug: "love",
    title: "Love",
    description: "God's love and loving one another",
    keywords: ["love", "beloved", "charity", "compassion", "kindness", "agape"],
    verseRefs: [{ bookSlug: "john", chapter: 3 }, { bookSlug: "romans", chapter: 8 }, { bookSlug: "1-corinthians", chapter: 13 }],
  },
  {
    slug: "peace",
    title: "Peace",
    description: "Peace that surpasses all understanding",
    keywords: ["peace", "rest", "still", "calm", "quiet", "shalom", "comfort"],
    verseRefs: [{ bookSlug: "john", chapter: 14 }, { bookSlug: "philippians", chapter: 4 }, { bookSlug: "isaiah", chapter: 26 }],
  },
] as const;

export function getTopicBySlug(slug: string): SemanticTopic | undefined {
  return SEMANTIC_TOPICS.find((t) => t.slug === slug);
}

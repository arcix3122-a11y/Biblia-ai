export interface PlanBook {
  slug: string;
  name: string;
  chapters: number;
}

export const PLAN_BOOKS: PlanBook[] = [
  { slug: "genesis", name: "Genesis", chapters: 50 },
  { slug: "exodus", name: "Exodus", chapters: 40 },
  { slug: "leviticus", name: "Leviticus", chapters: 27 },
  { slug: "numbers", name: "Numbers", chapters: 36 },
  { slug: "deuteronomy", name: "Deuteronomy", chapters: 34 },
  { slug: "joshua", name: "Joshua", chapters: 24 },
  { slug: "judges", name: "Judges", chapters: 21 },
  { slug: "ruth", name: "Ruth", chapters: 4 },
  { slug: "1-samuel", name: "1 Samuel", chapters: 31 },
  { slug: "2-samuel", name: "2 Samuel", chapters: 24 },
  { slug: "1-kings", name: "1 Kings", chapters: 22 },
  { slug: "2-kings", name: "2 Kings", chapters: 25 },
  { slug: "1-chronicles", name: "1 Chronicles", chapters: 29 },
  { slug: "2-chronicles", name: "2 Chronicles", chapters: 36 },
  { slug: "ezra", name: "Ezra", chapters: 10 },
  { slug: "nehemiah", name: "Nehemiah", chapters: 13 },
  { slug: "esther", name: "Esther", chapters: 10 },
  { slug: "job", name: "Job", chapters: 42 },
  { slug: "psalms", name: "Psalms", chapters: 150 },
  { slug: "proverbs", name: "Proverbs", chapters: 31 },
  { slug: "ecclesiastes", name: "Ecclesiastes", chapters: 12 },
  { slug: "song-of-solomon", name: "Song of Solomon", chapters: 8 },
  { slug: "isaiah", name: "Isaiah", chapters: 66 },
  { slug: "jeremiah", name: "Jeremiah", chapters: 52 },
  { slug: "lamentations", name: "Lamentations", chapters: 5 },
  { slug: "ezekiel", name: "Ezekiel", chapters: 48 },
  { slug: "daniel", name: "Daniel", chapters: 12 },
  { slug: "hosea", name: "Hosea", chapters: 14 },
  { slug: "joel", name: "Joel", chapters: 3 },
  { slug: "amos", name: "Amos", chapters: 9 },
  { slug: "obadiah", name: "Obadiah", chapters: 1 },
  { slug: "jonah", name: "Jonah", chapters: 4 },
  { slug: "micah", name: "Micah", chapters: 7 },
  { slug: "nahum", name: "Nahum", chapters: 3 },
  { slug: "habakkuk", name: "Habakkuk", chapters: 3 },
  { slug: "zephaniah", name: "Zephaniah", chapters: 3 },
  { slug: "haggai", name: "Haggai", chapters: 2 },
  { slug: "zechariah", name: "Zechariah", chapters: 14 },
  { slug: "malachi", name: "Malachi", chapters: 4 },
  { slug: "matthew", name: "Matthew", chapters: 28 },
  { slug: "mark", name: "Mark", chapters: 16 },
  { slug: "luke", name: "Luke", chapters: 24 },
  { slug: "john", name: "John", chapters: 21 },
  { slug: "acts", name: "Acts", chapters: 28 },
  { slug: "romans", name: "Romans", chapters: 16 },
  { slug: "1-corinthians", name: "1 Corinthians", chapters: 16 },
  { slug: "2-corinthians", name: "2 Corinthians", chapters: 13 },
  { slug: "galatians", name: "Galatians", chapters: 6 },
  { slug: "ephesians", name: "Ephesians", chapters: 6 },
  { slug: "philippians", name: "Philippians", chapters: 4 },
  { slug: "colossians", name: "Colossians", chapters: 4 },
  { slug: "1-thessalonians", name: "1 Thessalonians", chapters: 5 },
  { slug: "2-thessalonians", name: "2 Thessalonians", chapters: 3 },
  { slug: "1-timothy", name: "1 Timothy", chapters: 6 },
  { slug: "2-timothy", name: "2 Timothy", chapters: 4 },
  { slug: "titus", name: "Titus", chapters: 3 },
  { slug: "philemon", name: "Philemon", chapters: 1 },
  { slug: "hebrews", name: "Hebrews", chapters: 13 },
  { slug: "james", name: "James", chapters: 5 },
  { slug: "1-peter", name: "1 Peter", chapters: 5 },
  { slug: "2-peter", name: "2 Peter", chapters: 3 },
  { slug: "1-john", name: "1 John", chapters: 5 },
  { slug: "2-john", name: "2 John", chapters: 1 },
  { slug: "3-john", name: "3 John", chapters: 1 },
  { slug: "jude", name: "Jude", chapters: 1 },
  { slug: "revelation", name: "Revelation", chapters: 22 },
];

export interface DayAssignment {
  day: number;
  bookSlug: string;
  bookName: string;
  chapter: number;
}

// Generate flat list of all chapter assignments in canonical order
function buildPlanAssignments(): DayAssignment[] {
  const all: Array<{ bookSlug: string; bookName: string; chapter: number }> = [];
  for (const book of PLAN_BOOKS) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      all.push({ bookSlug: book.slug, bookName: book.name, chapter: ch });
    }
  }
  // 1189 chapters → 365 days → ~3.25 chapters/day
  // We assign day = Math.floor(index * 365 / 1189) + 1
  const total = all.length;
  const days = 365;
  return all.map((item, i) => ({
    ...item,
    day: Math.min(days, Math.floor((i * days) / total) + 1),
  }));
}

export const PLAN_ASSIGNMENTS: DayAssignment[] = buildPlanAssignments();

export function getAssignmentsForDay(day: number): DayAssignment[] {
  return PLAN_ASSIGNMENTS.filter((a) => a.day === day);
}

export const PLAN_TOTAL_DAYS = 365;

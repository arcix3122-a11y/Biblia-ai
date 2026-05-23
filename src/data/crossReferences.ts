export interface CrossRef {
  bookSlug: string;
  chapter: number;
  related: Array<{ bookSlug: string; bookName: string; chapter: number; theme: string }>;
}

export const CROSS_REFERENCES: CrossRef[] = [
  {
    bookSlug: "genesis", chapter: 1,
    related: [
      { bookSlug: "john", bookName: "John", chapter: 1, theme: "Creation & Word" },
      { bookSlug: "revelation", bookName: "Revelation", chapter: 21, theme: "New Creation" },
    ],
  },
  {
    bookSlug: "psalms", chapter: 23,
    related: [
      { bookSlug: "john", bookName: "John", chapter: 10, theme: "Good Shepherd" },
      { bookSlug: "isaiah", bookName: "Isaiah", chapter: 40, theme: "God's Comfort" },
    ],
  },
  {
    bookSlug: "psalms", chapter: 119,
    related: [
      { bookSlug: "deuteronomy", bookName: "Deuteronomy", chapter: 6, theme: "God's Word" },
      { bookSlug: "john", bookName: "John", chapter: 15, theme: "Abiding in Word" },
    ],
  },
  {
    bookSlug: "isaiah", chapter: 53,
    related: [
      { bookSlug: "luke", bookName: "Luke", chapter: 22, theme: "Suffering Servant" },
      { bookSlug: "1-peter", bookName: "1 Peter", chapter: 2, theme: "Christ bore our sins" },
    ],
  },
  {
    bookSlug: "isaiah", chapter: 40,
    related: [
      { bookSlug: "luke", bookName: "Luke", chapter: 3, theme: "Prepare the way" },
      { bookSlug: "romans", bookName: "Romans", chapter: 8, theme: "God's strength" },
    ],
  },
  {
    bookSlug: "matthew", chapter: 5,
    related: [
      { bookSlug: "luke", bookName: "Luke", chapter: 6, theme: "Sermon on Plain" },
      { bookSlug: "psalms", bookName: "Psalms", chapter: 37, theme: "Blessed are the meek" },
    ],
  },
  {
    bookSlug: "matthew", chapter: 6,
    related: [
      { bookSlug: "luke", bookName: "Luke", chapter: 11, theme: "Lord's Prayer" },
      { bookSlug: "philippians", bookName: "Philippians", chapter: 4, theme: "Anxiety & Peace" },
    ],
  },
  {
    bookSlug: "john", chapter: 1,
    related: [
      { bookSlug: "genesis", bookName: "Genesis", chapter: 1, theme: "In the beginning" },
      { bookSlug: "colossians", bookName: "Colossians", chapter: 1, theme: "Christ the Creator" },
    ],
  },
  {
    bookSlug: "john", chapter: 3,
    related: [
      { bookSlug: "romans", bookName: "Romans", chapter: 5, theme: "God's love" },
      { bookSlug: "1-john", bookName: "1 John", chapter: 4, theme: "God is love" },
    ],
  },
  {
    bookSlug: "john", chapter: 14,
    related: [
      { bookSlug: "hebrews", bookName: "Hebrews", chapter: 11, theme: "Faith in unseen" },
      { bookSlug: "revelation", bookName: "Revelation", chapter: 21, theme: "No more tears" },
    ],
  },
  {
    bookSlug: "romans", chapter: 8,
    related: [
      { bookSlug: "psalms", bookName: "Psalms", chapter: 34, theme: "God's protection" },
      { bookSlug: "isaiah", bookName: "Isaiah", chapter: 43, theme: "Do not fear" },
    ],
  },
  {
    bookSlug: "1-corinthians", chapter: 13,
    related: [
      { bookSlug: "john", bookName: "John", chapter: 15, theme: "Love one another" },
      { bookSlug: "1-john", bookName: "1 John", chapter: 4, theme: "God is love" },
    ],
  },
  {
    bookSlug: "philippians", chapter: 4,
    related: [
      { bookSlug: "matthew", bookName: "Matthew", chapter: 6, theme: "Do not worry" },
      { bookSlug: "psalms", bookName: "Psalms", chapter: 46, theme: "God our refuge" },
    ],
  },
  {
    bookSlug: "hebrews", chapter: 11,
    related: [
      { bookSlug: "romans", bookName: "Romans", chapter: 4, theme: "Faith of Abraham" },
      { bookSlug: "james", bookName: "James", chapter: 2, theme: "Faith and works" },
    ],
  },
  {
    bookSlug: "revelation", chapter: 21,
    related: [
      { bookSlug: "genesis", bookName: "Genesis", chapter: 2, theme: "Garden restored" },
      { bookSlug: "isaiah", bookName: "Isaiah", chapter: 65, theme: "New creation" },
    ],
  },
];

export function getCrossReferences(bookSlug: string, chapter: number): CrossRef | undefined {
  return CROSS_REFERENCES.find((r) => r.bookSlug === bookSlug && r.chapter === chapter);
}

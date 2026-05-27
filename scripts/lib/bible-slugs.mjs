/** Mobile demo slices — keep in sync with create-mobile-seed.mjs */
export const MOBILE_SLICES = [
  { slug: "genesis", chapter: 1 },
  { slug: "psalms", chapter: 23 },
  { slug: "john", chapter: 1 },
  { slug: "romans", chapter: 8, verses: [26, 31] },
];

/** midvash/bible-data book file names */
export const MIDVASH_BOOK_FILES = {
  genesis: "Gen",
  psalms: "Ps",
  john: "John",
  romans: "Rom",
};

/** App seed metadata per book slug */
export const BOOK_META = {
  genesis: { testament: "OT", name: "Genesis", order_index: 1, chapter_count: 50 },
  psalms: { testament: "OT", name: "Psalms", order_index: 19, chapter_count: 150 },
  john: { testament: "NT", name: "John", order_index: 43, chapter_count: 21 },
  romans: { testament: "NT", name: "Romans", order_index: 45, chapter_count: 16 },
};

export function pickMobileSlices(source, slices = MOBILE_SLICES) {
  return slices.map((slice) => {
    const book = source.books.find((entry) => entry.slug === slice.slug);
    if (!book) {
      throw new Error(`Book not found in source: ${slice.slug}`);
    }
    const chapterEntry = book.chapters.find((entry) => entry.number === slice.chapter);
    if (!chapterEntry) {
      throw new Error(`Chapter ${slice.chapter} not found in ${slice.slug}`);
    }
    let selectedVerses = chapterEntry.verses;
    if (slice.verses) {
      const [from, to] = slice.verses;
      selectedVerses = chapterEntry.verses.filter(
        (verse) => verse.number >= from && verse.number <= to
      );
      if (selectedVerses.length === 0) {
        throw new Error(`No verses ${from}-${to} in ${slice.slug} ${slice.chapter}`);
      }
    }
    return {
      testament: book.testament,
      name: book.name,
      slug: book.slug,
      order_index: book.order_index,
      chapter_count: book.chapter_count,
      chapters: [{ number: slice.chapter, verses: selectedVerses }],
    };
  });
}

export function countVerses(seed) {
  return seed.books.reduce(
    (total, book) =>
      total + book.chapters.reduce((sum, chapter) => sum + chapter.verses.length, 0),
    0
  );
}

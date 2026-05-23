import { useCallback, useEffect, useState } from "react";
import i18n from "@/i18n";
import type { Book, Chapter, Testament, Verse, VerseWithReference } from "@/types/scripture";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import { getDatabase } from "@/services/db/database";

export function useDatabaseReady(): { ready: boolean; error: string | null } {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getDatabase()
      .then(() => {
        if (mounted) {
          setReady(true);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : i18n.t("errors.databaseOpenFailed"));
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { ready, error };
}

export function useBooks(testament: Testament) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await scriptureRepo.getBooksByTestament(testament);
    setBooks(result);
    setLoading(false);
  }, [testament]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { books, loading, refresh };
}

export function useBook(slug: string | undefined) {
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setBook(null);
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    scriptureRepo.getBookBySlug(slug).then((result) => {
      if (mounted) {
        setBook(result);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [slug]);

  return { book, loading };
}

export function useChapters(bookId: number | undefined) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookId) {
      setChapters([]);
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    scriptureRepo.getChaptersByBookId(bookId).then((result) => {
      if (mounted) {
        setChapters(result);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [bookId]);

  return { chapters, loading };
}

export function useChapterVerses(bookId: number | undefined, chapterNumber: number) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [chapterId, setChapterId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookId || !chapterNumber) {
      setVerses([]);
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    (async () => {
      const chapter = await scriptureRepo.getChapter(bookId, chapterNumber);
      if (!chapter) {
        if (mounted) {
          setVerses([]);
          setChapterId(null);
          setLoading(false);
        }
        return;
      }
      const result = await scriptureRepo.getVersesByChapterId(chapter.id);
      if (mounted) {
        setChapterId(chapter.id);
        setVerses(result);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [bookId, chapterNumber]);

  return { verses, chapterId, loading };
}

export function useVerseSearch() {
  const [results, setResults] = useState<VerseWithReference[]>([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (query: string) => {
    setSearching(true);
    const hits = await scriptureRepo.searchVerses(query);
    setResults(hits);
    setSearching(false);
  }, []);

  const clear = useCallback(() => setResults([]), []);

  return { results, searching, search, clear };
}

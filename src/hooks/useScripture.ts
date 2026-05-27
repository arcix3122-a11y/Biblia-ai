import { useCallback, useEffect, useState } from "react";
import i18n from "@/i18n";
import type { Book, Chapter, Testament, Verse, VerseWithReference } from "@/types/scripture";
import * as scriptureRepo from "@/services/db/scriptureRepository";
import { getDatabase, resetDatabaseInit } from "@/services/db/database";
import { useLocaleStore } from "@/store/localeStore";
import { useActiveTranslation } from "@/store/translationStore";

const DB_INIT_TIMEOUT_MS = 300_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export function useDatabaseReady(): {
  ready: boolean;
  error: string | null;
  retry: () => void;
} {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    resetDatabaseInit();
    setReady(false);
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    setReady(false);
    setError(null);

    void withTimeout(
      getDatabase(),
      DB_INIT_TIMEOUT_MS,
      i18n.t("errors.databaseInitTimeout")
    )
      .then(() => {
        if (mounted) {
          setReady(true);
        }
      })
      .catch((err: unknown) => {
        resetDatabaseInit();
        if (mounted) {
          setError(err instanceof Error ? err.message : i18n.t("errors.databaseOpenFailed"));
        }
      });
    return () => {
      mounted = false;
    };
  }, [attempt]);

  return { ready, error, retry };
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
  const locale = useLocaleStore((s) => s.locale);
  const translation = useActiveTranslation(locale);
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
      const result = await scriptureRepo.getVersesByChapterId(chapter.id, translation);
      if (mounted) {
        setChapterId(chapter.id);
        setVerses(result);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [bookId, chapterNumber, translation]);

  return { verses, chapterId, loading, translation };
}

export function useVerseSearch() {
  const locale = useLocaleStore((s) => s.locale);
  const translation = useActiveTranslation(locale);
  const [results, setResults] = useState<VerseWithReference[]>([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(
    async (query: string) => {
      setSearching(true);
      const hits = await scriptureRepo.searchVerses(query, translation);
      setResults(hits);
      setSearching(false);
    },
    [translation]
  );

  const clear = useCallback(() => setResults([]), []);

  return { results, searching, search, clear, translation };
}

export function useFullBibleAvailable() {
  const locale = useLocaleStore((s) => s.locale);
  const translation = useActiveTranslation(locale);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    void scriptureRepo.hasFullBibleTranslation(translation).then((result) => {
      if (mounted) {
        setAvailable(result);
      }
    });
    return () => {
      mounted = false;
    };
  }, [translation]);

  return available;
}

import { useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@biblia-ai/search-history";
const MAX_ITEMS = 8;

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    void AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setHistory(JSON.parse(raw) as string[]);
    });
  }, []);

  const addToHistory = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    setHistory((prev) => {
      const filtered = prev.filter((q) => q !== trimmed);
      const next = [trimmed, ...filtered].slice(0, MAX_ITEMS);
      void AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(async () => {
    await AsyncStorage.removeItem(KEY);
    setHistory([]);
  }, []);

  const removeFromHistory = useCallback(async (query: string) => {
    setHistory((prev) => {
      const next = prev.filter((item) => item !== query);
      void AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { history, addToHistory, clearHistory, removeFromHistory };
}

import { useEffect } from "react";
import { useHighlightsStore } from "@/store/highlightsStore";

export function useHighlights() {
  const store = useHighlightsStore();

  useEffect(() => {
    void useHighlightsStore.getState().loadHighlights();
  }, []);

  return store;
}

import { useEffect } from "react";
import { useBookmarksStore } from "@/store/bookmarksStore";

export function useBookmarks() {
  const store = useBookmarksStore();

  useEffect(() => {
    void useBookmarksStore.getState().loadBookmarks();
  }, []);

  return store;
}

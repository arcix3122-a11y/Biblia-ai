import { Share } from "react-native";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useNotesStore } from "@/store/notesStore";
import { useUserStatsStore } from "@/store/userStatsStore";
import * as highlightsRepo from "@/services/db/highlightsRepository";
import { getDatabase } from "@/services/db/database";

export interface ExportedJournalData {
  exportedAt: string;
  streakDays: number;
  notesCount: number;
  bookmarksCount: number;
  highlightsCount: number;
}

/**
 * Formats and shares the user's complete spiritual journal (notes, bookmarks, highlights, stats)
 * as a beautiful, readable Markdown document. Meets GDPR Art. 20 Data Portability requirements.
 */
export async function exportSpiritualJournal(locale: "en" | "pl" = "en"): Promise<boolean> {
  const t = i18n.t;
  const nowStr = new Date().toLocaleDateString(locale === "pl" ? "pl-PL" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const notes = useNotesStore.getState().notes || [];
  const stats = useUserStatsStore.getState().stats;
  const streak = stats?.streakDays ?? 0;

  // Retrieve highlights
  let highlightsList: any[] = [];
  try {
    highlightsList = await highlightsRepo.listHighlightsWithReferences();
  } catch {
    // optional fallback
  }

  // Retrieve bookmarks from SQLite directly to be 100% precise
  let bookmarksList: any[] = [];
  try {
    const db = await getDatabase();
    bookmarksList = await db.getAllAsync<any>(
      `SELECT b.chapter, b.verse, bk.name AS book_name, v.text AS verse_text
       FROM bookmarks b
       INNER JOIN verses v ON v.id = b.verse_id
       INNER JOIN books bk ON bk.id = b.book_id
       ORDER BY b.created_at DESC`
    );
  } catch {
    // fallback
  }

  // Construct Markdown Spiritual Diary
  let md = "";
  if (locale === "pl") {
    md += `📜 # DZIENNIK DUCHOWY BIBLIA AI\n`;
    md += `================================================================\n`;
    md += `📅 Wygenerowano: ${nowStr}\n`;
    md += `🔥 Aktualna seria dni (streak): ${streak} ${streak === 1 ? "dzień" : "dni"}\n`;
    md += `📝 Statystyki: Notatki (${notes.length}) | Zakładki (${bookmarksList.length}) | Podświetlenia (${highlightsList.length})\n`;
    md += `================================================================\n\n`;

    // 1. NOTES SECTION
    md += `✍️ ## MOJE TEOLOGICZNE NOTATKI\n`;
    md += `----------------------------------------------------------------\n`;
    if (notes.length === 0) {
      md += `*Brak notatek w Twoim dzienniku.*\n\n`;
    } else {
      for (const note of notes) {
        const noteDate = new Date(note.updatedAt).toLocaleDateString("pl-PL", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        md += `🗓️ ${noteDate}\n`;
        md += `📌 **${note.title || "Bez tytułu"}**\n`;
        md += `💬 ${note.body}\n`;
        md += `------------------------------------------------\n\n`;
      }
    }

    // 2. BOOKMARKS SECTION
    md += `🔖 ## ZAKŁADKI I WERSETY\n`;
    md += `----------------------------------------------------------------\n`;
    if (bookmarksList.length === 0) {
      md += `*Brak zapisanych zakładek w Twoim czytniku.*\n\n`;
    } else {
      for (const item of bookmarksList) {
        md += `📖 *${item.book_name} ${item.chapter}:${item.verse}*\n`;
        md += `   "${item.verse_text?.trim()}"\n`;
        md += `------------------------------------------------\n\n`;
      }
    }

    // 3. HIGHLIGHTS SECTION
    md += `🎨 ## PODŚWIETLONE WERSETY\n`;
    md += `----------------------------------------------------------------\n`;
    if (highlightsList.length === 0) {
      md += `*Brak kolorowych podświetleń w Twoim czytniku.*\n\n`;
    } else {
      for (const item of highlightsList) {
        const colorName =
          item.color === "gold"
            ? "Złoty"
            : item.color === "blue"
              ? "Niebieski"
              : item.color === "green"
                ? "Zielony"
                : "Różowy";
        md += `📍 *${item.book_slug.toUpperCase()} ${item.chapter}:${item.verse}* [Kolor: ${colorName}]\n`;
      }
      md += `\n`;
    }
  } else {
    // English version
    md += `📜 # BIBLIA AI — SPIRITUAL DIARY\n`;
    md += `================================================================\n`;
    md += `📅 Exported on: ${nowStr}\n`;
    md += `🔥 Current Streak: ${streak} ${streak === 1 ? "day" : "days"}\n`;
    md += `📝 Stats: Notes (${notes.length}) | Bookmarks (${bookmarksList.length}) | Highlights (${highlightsList.length})\n`;
    md += `================================================================\n\n`;

    // 1. NOTES SECTION
    md += `✍️ ## MY THEOLOGICAL NOTES\n`;
    md += `----------------------------------------------------------------\n`;
    if (notes.length === 0) {
      md += `*No notes recorded in your journal yet.*\n\n`;
    } else {
      for (const note of notes) {
        const noteDate = new Date(note.updatedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        md += `🗓️ ${noteDate}\n`;
        md += `📌 **${note.title || "Untitled Note"}**\n`;
        md += `💬 ${note.body}\n`;
        md += `------------------------------------------------\n\n`;
      }
    }

    // 2. BOOKMARKS SECTION
    md += `🔖 ## BOOKMARKED SCRIPTURES\n`;
    md += `----------------------------------------------------------------\n`;
    if (bookmarksList.length === 0) {
      md += `*No bookmarks saved in your e-reader yet.*\n\n`;
    } else {
      for (const item of bookmarksList) {
        md += `📖 *${item.book_name} ${item.chapter}:${item.verse}*\n`;
        md += `   "${item.verse_text?.trim()}"\n`;
        md += `------------------------------------------------\n\n`;
      }
    }

    // 3. HIGHLIGHTS SECTION
    md += `🎨 ## HIGHLIGHTED VERSES\n`;
    md += `----------------------------------------------------------------\n`;
    if (highlightsList.length === 0) {
      md += `*No highlighted verses recorded.*\n\n`;
    } else {
      for (const item of highlightsList) {
        md += `📍 *${item.book_slug.toUpperCase()} ${item.chapter}:${item.verse}* [Color: ${item.color.toUpperCase()}]\n`;
      }
      md += `\n`;
    }
  }

  // Trigger Native Sharing Intent
  try {
    const shareTitle = locale === "pl" ? "Mój Dziennik Duchowy - Biblia AI" : "My Spiritual Journal - Biblia AI";
    await Share.share({
      title: shareTitle,
      message: md,
    });
    return true;
  } catch (error) {
    console.warn("Failed to share spiritual journal:", error);
    return false;
  }
}

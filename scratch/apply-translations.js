const fs = require('fs');

// Deep merge helper
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const enAdditions = {
  settings: {
    privacyPolicy: "Privacy Policy",
    privacyPolicyHint: "Read our privacy policy to learn how we protect your data and what services are used.",
    privacyPolicyView: "Open privacy policy"
  },
  study: {
    localOriginalUnavailable: "Original-language data unavailable offline",
    localOriginalSource: "Local library",
    localOriginalMeaning: "Use the live study service for Greek or Hebrew parsing.",
    localOriginalStrong: "Offline",
    localCommentaryReference: "Start with the immediate text: {{reference}} sits inside this chapter, so read the paragraph before drawing conclusions.",
    localCommentaryContext: "Nearby context: before - {{before}} / after - {{after}}",
    localCommentaryPractice: "Write one sentence about what the verse says, one about what it reveals about God, and one faithful step for today.",
    contextBoundaryBefore: "This is the first verse available in the chapter.",
    contextBoundaryAfter: "This is the last verse available in the chapter.",
  },
  audio: {
    nowPlaying: "Now playing: {{reference}}",
    previousChapter: "Previous chapter",
    pause: "Pause",
    play: "Play",
    nextChapter: "Next chapter",
    verseSpoken: "Verse {{number}}. {{text}}",
    chapterSpoken: "Chapter {{chapter}} of the Book of {{book}}."
  },
  review: {
    title: "Verse Review",
    subtitle: "Repeat verses saved from bookmarks and highlights.",
    loading: "Preparing review deck...",
    emptyTitle: "No verses to review yet",
    emptyBody: "Bookmark or highlight verses in the reader and they will become flashcards here.",
    openWorkspace: "Open saved verses",
    progress: "{{current}} / {{total}}",
    sourceBookmark: "Bookmark",
    sourceHighlight: "Highlight",
    hiddenHint: "Tap to reveal the verse.",
    cardRevealed: "Verse revealed",
    reveal: "Reveal",
    reviewLater: "Review later",
    remembered: "I remember",
    openInReader: "Open in reader"
  },
  ad: {
    sponsorLabel: "AD",
    fallbackTitle: "Ad slot unavailable here",
    fallbackBody: "Real AdMob banners render in dev, preview, or store builds with the native ads module."
  },
  ai: {
    chapterReflectionStarter: "Help me reflect on the chapter I just read. Show the main theme, one honest question to carry, and one next step of prayer or obedience.",
    quota: {
      unlimited: "Unlimited daily responses (supporter rank)",
      dailyRemaining: "{{remaining}} / {{limit}} responses left today",
      tierBonus: "Tier {{tier}} — expanded daily AI quota",
      limitReachedTitle: "Daily AI Limit Reached",
      limitReachedBody: "You have used your free responses for today. Supporters receive more interactive chats with the companion each day.",
      upgradeCta: "Unlock more responses"
    }
  },
  votdComments: {
    notificationTitle: "New reflection comment",
    notificationBody: "Someone commented on today's verse: {{reference}}",
    reply: "Reply",
    replyingTo: "Replying to {{reader}}",
    cancelReply: "Cancel reply"
  },
  home: {
    ratingPromptTitle: "Enjoying Biblia AI?",
    ratingPromptBody: "Could you take a moment to rate us on Google Play? It helps others find our peaceful reading experience.",
    ratingPromptLater: "Maybe later",
    ratingPromptRateNow: "Rate now",
    tileReview: "Daily Review",
    tileReviewSub: "Practice your memorized verses"
  },
  reader: {
    aiChapterFollowUp: "Reflect with Companion",
    aiChapterFollowUpSub: "Ask one grounded follow-up from this chapter."
  },
  donation: {
    perks: {
      aiQuota: "{{count}} AI Companion responses daily",
      aiUnlimited: "Unlimited AI Companion responses daily"
    }
  },
  readingPlan: {
    yearTitle: "Bible in a year",
    yearSubtitle: "One shared progress track across Home and the full plan.",
    fullBibleRequiredShort: "Import the full Bible to unlock the 365-day plan.",
    notStarted: "Ready to begin",
    progressPercent: "{{percent}}%",
    assignmentsCount: "{{count}} chapter today",
    assignmentsCount_one: "{{count}} chapter today",
    assignmentsCount_few: "{{count}} chapters today",
    assignmentsCount_many: "{{count}} chapters today",
    assignmentsCount_other: "{{count}} chapters today",
    openPlan: "Open plan",
    startPlan: "Start plan"
  }
};

const plAdditions = {
  settings: {
    privacyPolicy: "Polityka prywatności",
    privacyPolicyHint: "Przeczytaj naszą politykę prywatności, aby dowiedzieć się, jak chronimy Twoje dane i jakie usługi są wykorzystywane.",
    privacyPolicyView: "Otwórz politykę prywatności"
  },
  study: {
    localOriginalUnavailable: "Dane języków oryginalnych są niedostępne offline",
    localOriginalSource: "Lokalna biblioteka",
    localOriginalMeaning: "Użyj usługi analizy online, aby uzyskać dostęp do gramatyki greckiej lub hebrajskiej.",
    localOriginalStrong: "Offline",
    localCommentaryReference: "Zacznij od bezpośredniego tekstu: {{reference}} znajduje się w tym rozdziale, więc przeczytaj cały akapit przed wyciągnięciem wniosków.",
    localCommentaryContext: "Kontekst wersetu: przed - {{before}} / po - {{after}}",
    localCommentaryPractice: "Napisz jedno zdanie o tym, co mówi ten werset, jedno o tym, co objawia o Bogu, i jeden wierny krok do zrobienia dzisiaj.",
    contextBoundaryBefore: "To jest pierwszy dostępny werset w tym rozdziale.",
    contextBoundaryAfter: "To jest ostatni dostępny werset w tym rozdziale.",
  },
  audio: {
    nowPlaying: "Teraz odtwarzane: {{reference}}",
    previousChapter: "Poprzedni rozdział",
    pause: "Pauza",
    play: "Odtwórz",
    nextChapter: "Następny rozdział",
    verseSpoken: "Werset {{number}}. {{text}}",
    chapterSpoken: "Rozdział {{chapter}} Księgi {{book}}."
  },
  review: {
    title: "Powtórka wersetów",
    subtitle: "Powtarzaj wersety zapisane w zakładkach i wyróżnieniach.",
    loading: "Przygotowywanie talii powtórek...",
    emptyTitle: "Brak wersetów do powtórki",
    emptyBody: "Dodaj do zakładek lub wyróżnij wersety w czytniku, a pojawią się tutaj jako fiszki.",
    openWorkspace: "Otwórz zapisane wersety",
    progress: "{{current}} / {{total}}",
    sourceBookmark: "Zakładka",
    sourceHighlight: "Wyróżnienie",
    hiddenHint: "Dotknij, aby odkryć werset.",
    cardRevealed: "Werset odkryty",
    reveal: "Odkryj",
    reviewLater: "Powtórz później",
    remembered: "Pamiętam",
    openInReader: "Otwórz w czytniku"
  },
  ad: {
    sponsorLabel: "SPONSOROWANE",
    fallbackTitle: "Miejsce na reklamę niedostępne",
    fallbackBody: "Rzeczywiste banery AdMob renderują się w kompilacjach deweloperskich, podglądowych lub sklepowych z natywnym modułem reklam."
  },
  ai: {
    chapterReflectionStarter: "Pomóż mi rozważyć rozdział, który właśnie przeczytałem. Pokaż główny temat, jedno szczere pytanie do przemyślenia i kolejny krok modlitwy lub posłuszeństwa.",
    quota: {
      unlimited: "Nielimitowane odpowiedzi dziennie (przywilej wspierającego)",
      dailyRemaining: "Pozostało dziś {{remaining}} z {{limit}} odpowiedzi",
      tierBonus: "Poziom {{tier}} — rozszerzony dzienny limit AI",
      limitReachedTitle: "Osiągnięto dzienny limit AI",
      limitReachedBody: "Wykorzystałeś darmowe odpowiedzi na dziś. Wspierający otrzymują więcej rozmów z towarzyszem każdego dnia.",
      upgradeCta: "Odblokuj więcej odpowiedzi"
    }
  },
  votdComments: {
    notificationTitle: "Nowy komentarz do refleksji",
    notificationBody: "Ktoś skomentował dzisiejszy werset: {{reference}}",
    reply: "Odpowiedz",
    replyingTo: "Odpowiedź dla {{reader}}",
    cancelReply: "Anuluj odpowiedź"
  },
  home: {
    ratingPromptTitle: "Podoba Ci się Biblia AI?",
    ratingPromptBody: "Czy mógłbyś poświęcić chwilę na ocenę w Google Play? Pomaga to innym znaleźć naszą spokojną aplikację.",
    ratingPromptLater: "Może później",
    ratingPromptRateNow: "Oceń teraz",
    tileReview: "Codzienna powtórka",
    tileReviewSub: "Ćwicz zapamiętane wersety"
  },
  reader: {
    aiChapterFollowUp: "Rozważ z Asystentem",
    aiChapterFollowUpSub: "Zadaj jedno konkretne pytanie uzupełniające do tego rozdziału."
  },
  donation: {
    perks: {
      aiQuota: "{{count}} odpowiedzi Towarzysza AI dziennie",
      aiUnlimited: "Nielimitowane odpowiedzi Towarzysza AI dziennie"
    }
  },
  readingPlan: {
    yearTitle: "Biblia w rok",
    yearSubtitle: "Jeden wspólny postęp na ekranie głównym i w pełnym planie.",
    fullBibleRequiredShort: "Zaimportuj pełną Biblię, aby odblokować plan 365 dni.",
    notStarted: "Gotowy do startu",
    progressPercent: "{{percent}}%",
    assignmentsCount: "{{count}} rozdział dziś",
    assignmentsCount_one: "{{count}} rozdział dziś",
    assignmentsCount_few: "{{count}} rozdziały dziś",
    assignmentsCount_many: "{{count}} rozdziałów dziś",
    assignmentsCount_other: "{{count}} rozdziału dziś",
    openPlan: "Otwórz plan",
    startPlan: "Rozpocznij plan"
  }
};

const enPath = 'src/i18n/locales/en.json';
const plPath = 'src/i18n/locales/pl.json';

try {
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const pl = JSON.parse(fs.readFileSync(plPath, 'utf8'));
  
  deepMerge(en, enAdditions);
  deepMerge(pl, plAdditions);
  
  fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
  fs.writeFileSync(plPath, JSON.stringify(pl, null, 2) + '\n', 'utf8');
  
  console.log('Successfully applied all translations to en.json and pl.json!');
} catch (e) {
  console.error('Failed to apply translations:', e);
}

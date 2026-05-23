# Biblia AI

**Biblia AI** by SolidCode Apps — local-first Bible reader with spiritual companion chat (Expo SDK 56).

## Quick start

```bash
npm install
npx expo start
```

Typecheck:

```bash
npm run typecheck
```

## Environment (optional)

Create `.env` (never commit secrets):

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Remote `error_logs` table (offline queue flushes on app active) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `EXPO_PUBLIC_AI_API_KEY` | OpenAI-compatible chat API (Groq supported via custom URL) |
| `EXPO_PUBLIC_AI_API_URL` | Defaults to OpenAI chat completions |
| `EXPO_PUBLIC_AI_MODEL` | Defaults to `gpt-4o-mini` |

Without AI keys, the Companion tab uses local mock responses. Without Supabase, errors queue in AsyncStorage.

## Cyber-Monastery design system

Canvas `#000000`, tiles `#0A101D`, accent `#E5A93C` (active only), glass borders `rgba(255,255,255,0.06)`. See `src/theme/`.

Theme is fixed dark in Phase 1. Reader font size and immersive mode are in **Settings** (gear on Home) and persist via `readerStore`.

## App structure

| Area | Path |
|------|------|
| Routes | `app/` (expo-router) |
| Screens | `src/screens/` |
| SQLite + seed | `src/services/db/` |
| Stores | `src/store/` (zustand) |
| Theme | `src/theme/` |

**Tabs:** Scripture (Home), Companion (AI), Workspace (notes + bookmarks).

**Stack:** Book chapters → Reader → Topics; Settings from Home gear icon.

## Seeded Scripture

`assets/bible-seed.json` — Genesis 1, Psalms 23, John 1, Romans 8:26–31 (KJV-style sample).

## Full Bible import

1. Obtain or build a JSON export matching `assets/bible-seed.json` shape (`books[]` → `chapters[]` → `verses[]`).
2. Validate: `node scripts/import-full-bible.mjs ./your-bible.json`
3. Install into bundle: `node scripts/prepare-bible-seed.mjs ./your-bible.json`
4. Reinstall the app or clear storage so `seed.ts` runs on empty DB.

Raw KJV source for tooling may live at `scripts/source-kjv-full.json` (not bundled).

## Languages / Języki

Biblia AI supports **Polish (PL)** and **English (EN)** for all app UI strings (tabs, screens, settings, errors). Scripture text in SQLite remains in the bundled translation (KJV-style sample or your imported Bible JSON).

### Switching language / Zmiana języka

1. Open **Home** → gear icon → **Settings** / **Ustawienia**.
2. In the **Language** / **Język** section, tap **PL** or **EN** on the segmented control (`LanguageSwitcher`).
3. The choice is saved in AsyncStorage (`@biblia-ai/locale`) and applied immediately via `i18n.changeLanguage`; tab labels and stack headers re-render.

### Device locale detection / Wykrywanie języka urządzenia

On first launch (no saved preference):

- `expo-localization` reads the device language code (`getLocales()[0].languageCode`).
- If it is `pl`, the UI starts in Polish; otherwise English is used (`getDeviceLocale()` in `src/i18n/index.ts`).
- Fallback language is always **English** (`fallbackLng: "en"`).

After the user picks a language in Settings, that stored value overrides the device locale on every subsequent launch.

### Adding or editing translations / Dodawanie tłumaczeń

| Path | Purpose |
|------|---------|
| `src/i18n/locales/en.json` | English UI strings |
| `src/i18n/locales/pl.json` | Polish UI strings (natural wording; add `_one` / `_few` / `_many` plural keys where i18next needs them) |
| `src/i18n/index.ts` | i18next init, device locale helper |
| `src/i18n/types.ts` | Typed keys (inferred from `en.json`) |
| `src/store/localeStore.ts` | Persisted `pl` \| `en` + sync with i18n |
| `src/hooks/useAppTranslation.ts` | `t`, `locale`, `setLocale` wrapper |

Use nested keys by feature namespace, e.g. `home.searchPlaceholder`, `settings.language`, `ai.limitReached`. Add the **same key path** to both JSON files. In components: `const { t } = useTranslation()` or `useAppTranslation()`, then `t("home.continueReading")`.

See `AGENTS.md` → **Internationalization (i18n)** for agent conventions.

## How to test

| Feature | Steps |
|---------|--------|
| Language switch | Settings → Language → PL / EN → verify tabs, headers, and screen copy |
| First-run language tip | Fresh install → Home shows dismissible tip → Settings link works → dismiss persists |
| KJV notice | Open any chapter in Reader → info banner shows English (KJV) text note |
| Search history | Home → search 2+ chars → submit or tap result → recent chips appear → Clear removes |
| Immersive reader | Reader → Immersive → exit |
| Share verse image | Home dashboard → Share story |
| Topics | Home → topic tile |
| Audio stub | Reader → Listen → GlobalAudioBar |
| AI pills | Select verse in reader → Companion → pill |
| Bookmarks | Reader → bookmark verse → Workspace → Zakładki |
| Recent reads | Read a chapter → Home → Recently read |
| Search | Home → type 2+ chars → debounced results with highlight |
| Settings | Home gear → font size / immersive toggle |
| Pull to refresh | Home → pull down → recently read / bookmarks refresh |
| App version | Settings → About → version label visible |
| Scroll to verse | Home search or history → tap result → reader scrolls to verse |
| Error retry | Simulate DB error screen → Try again button works |

## Agent docs

- `AGENTS.md` — conventions for coding agents
- `AGENT_WORKLOG.md` — chronological task log

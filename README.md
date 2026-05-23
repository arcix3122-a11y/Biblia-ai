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

## How to test

| Feature | Steps |
|---------|--------|
| Immersive reader | Reader → Immersive → exit |
| Share verse image | Home dashboard → Share story |
| Topics | Home → topic tile |
| Audio stub | Reader → Listen → GlobalAudioBar |
| AI pills | Select verse in reader → Companion → pill |
| Bookmarks | Reader → bookmark verse → Workspace → Zakładki |
| Recent reads | Read a chapter → Home → Recently read |
| Search | Home → type 2+ chars → debounced results with highlight |
| Settings | Home gear → font size / immersive toggle |

## Agent docs

- `AGENTS.md` — conventions for coding agents
- `AGENT_WORKLOG.md` — chronological task log

# Biblia AI — Agent Guide

## Expo version

Read the exact versioned docs at https://docs.expo.dev/versions/v52.0.0/ before writing any code.

## Internationalization (PL / EN)

**Status: implemented** — stack wired (`expo-localization`, `i18next`, `react-i18next`; `src/i18n/`, `localeStore`, `LanguageSwitcher` on Settings, root init in `app/_layout.tsx`). Remaining screens may still be migrated off hardcoded strings in parallel PRs. The product ships **Polish + English end-to-end** from day one. Scripture text in SQLite remains **KJV English**; all app chrome, labels, and AI companion UI are bilingual.

### Stack and file layout

| Piece | Path / package |
|-------|----------------|
| Device locale | `expo-localization` (`getLocales()`) — initial language when no saved preference |
| i18n core | `i18next` + `react-i18next`, initialized in `src/i18n/index.ts` |
| Locale JSON | `src/i18n/locales/en.json`, `src/i18n/locales/pl.json` |
| Persisted preference | `src/store/localeStore.ts` (Zustand + AsyncStorage) |
| App hook | `src/hooks/useAppTranslation.ts` — thin wrapper over `useTranslation` with typed namespaces |
| Language switcher | `src/components/LanguageSwitcher.tsx` — rendered on **Settings** (`src/screens/SettingsScreen.tsx`) |

Wire i18n in `app/_layout.tsx` before screens mount (import `@/i18n`, hydrate `localeStore`).

### Rules for all agents

1. **Never hardcode user-visible strings in TSX/TS** — no Polish or English literals in components, hooks, or alerts. Use translation keys.
2. **Always add keys to BOTH locales** — every new key goes in `en.json` **and** `pl.json` in the same commit. Missing keys fall back to English and look broken in QA.
3. **Use the hooks** — prefer `useAppTranslation('namespace')` in screens/components; use `useTranslation` from `react-i18next` only in non-React modules if needed.
4. **Namespace / key naming**
   - One namespace per feature area: `common`, `home`, `reader`, `settings`, `ai`, `workspace`, `errors`.
   - Keys are **camelCase**, grouped by screen section: `settings.appearance`, `reader.immersiveOn`.
   - Reuse `common.*` for shared actions (`save`, `cancel`, `back`, `loading`).
   - Do not embed dynamic values in key names; use i18next interpolation: `"currentFontSize": "Current size: {{size}}px"`.
   - Polish plural forms: add `_one`, `_few`, `_many` in `pl.json` where needed (see `home.searchHint_*`, `book.chaptersAvailable_*`).
5. **Language switching** — user picks PL or EN in Settings via `LanguageSwitcher`; call `setLocale` from `useAppTranslation` / `localeStore` (not raw `i18n.changeLanguage` outside `localeStore` / `initI18n`). Choice persists in AsyncStorage; on first launch, default follows device locale (`pl` → Polish, otherwise English).
6. **Scripture vs UI** — book/chapter/verse **content** comes from `assets/bible-seed.json` (KJV). UI labels for books (e.g. Polish abbreviations in notes) stay in locale files or existing slug maps; do not duplicate verse text in JSON locales.
7. **QA before merge** — diff key paths between `en.json` and `pl.json`; format user-visible dates with `Intl` and active locale (`pl-PL` / `en-US`). Mock AI replies and error fallbacks live in locale JSON (`ai.fallbackResponses.*`, `errors.*`).

### How to test both locales

```bash
npm run typecheck
npx expo start
```

1. Open **Settings** (gear on Home) → switch **Polish / English** → confirm labels update without restart.
2. Kill and relaunch the app → confirm persisted language.
3. Change device language (or simulate via `expo-localization` in dev) with no saved preference → confirm correct default.
4. Spot-check each tab (Scripture, Companion, Workspace) and stack screens (book, reader, topics).
5. Grep for regressions: search `src/` for quoted UI strings in `.tsx` files you touched.

## UX principles

These rules apply to all UI work — especially first-run and Polish-primary users.

1. **Three taps to Scripture** — a new user must reach a readable chapter in ≤3 taps from cold launch (Home → book → chapter). Defer secondary features (stats, plans, ecosystem, language tips) until after first successful read.
2. **Audio onboarding (first launch)** — full-screen immersive carousel (`AudioOnboarding`, 100-slide scaffold) gates main tabs once; completion persists in `@biblia-ai/audio-onboarding-complete`. Returning users skip automatically.
3. **Language coherence** — UI chrome follows active locale (PL/EN). Book **labels** in grids, headers, and history use localized display names; verse **text** stays KJV English until a second translation ships. Never show English book names on a Polish UI without a visible KJV/scripture notice.
4. **Progressive Settings** — default view shows Language, Reader (font + immersive), short AI status, About. Advanced items (notifications, cloud sync, daily goal, ecosystem, provider/model/endpoint) live under a collapsed **Advanced** section.
5. **AI must never feel broken** — if live API fails or key is missing, fall back to localized mock replies with a clear banner (`retry` + optional “using offline companion”). Do not disable the chat input permanently on `lastError`.
6. **No dev chrome in production UX** — gate `OfflineBadge`, debug overlays, and provider/endpoint fields behind `__DEV__` or Advanced Settings. First launch must not auto-show marketing modals (`EcosystemModal`).
7. **Honest offline scope** — if seed is mobile/demo (4 books), say so in UI and README; if full 66-book KJV is bundled, show seed progress on first launch instead of an infinite spinner.
8. **Smoke test > typecheck** — `npm run typecheck` is necessary but not sufficient. Every UX-affecting PR needs Expo Go verification on a physical device in **both** PL and EN before DONE in worklog.

## Architecture (SolidCode Apps)

- **Router:** `expo-router` — `app/(tabs)/` for Home, AI, Workspace; stack screens for book, reader, topic, settings.
- **Data:** `expo-sqlite` via `src/services/db/database.ts`; seed from `assets/bible-seed.json` in `seed.ts` (runs once when `books` is empty).
- **State:** Zustand stores in `src/store/` — `readerStore` (persisted font), `bookmarksStore`, `historyStore`, `aiChatStore` (persisted chat), `notesStore`, `selectionStore`, `audioStore`.
- **Errors:** `src/services/errors/errorLogger.ts` → Supabase `error_logs` (same pattern as prawojazdy); offline queue in AsyncStorage; `initializeErrorLogger()` on launch and when `AppState` is `active` (`app/_layout.tsx`).
- **AI:** `useSpiritualAssistant` — live OpenAI-compatible API when `EXPO_PUBLIC_AI_API_KEY` is set; otherwise mock replies. Quota: 20 user turns in `aiChatStore`.
- **Theme:** `@/theme` — gold-on-black Cyber-Monastery; do not add light theme without product approval.
- **Imports:** use `@/` path alias (see `tsconfig.json`).
- **i18n:** Polish + English UI via `i18next` / `react-i18next` (`src/i18n/`). User preference in `localeStore`; device locale via `expo-localization`. See **Internationalization (PL / EN)** above.

### Commands

```bash
npm install
npm run typecheck
npx expo start
node scripts/import-full-bible.mjs <file.json>
node scripts/prepare-bible-seed.mjs <file.json>
```

### Init on app start

`app/_layout.tsx` opens SQLite, loads bookmarks + reading history into stores, and registers global error handling.

## Workspace Agent Rules (All Bots)

These rules apply to every coding agent and subagent working in this repository.

### 1) Mandatory Expo docs source
- Always use Expo documentation for version `52.0.0`.
- Do not rely on generic Expo blog posts or snippets for other versions.

### 2) Before making changes
- Read relevant existing files first.
- Keep edits minimal and scoped to the request.
- Avoid unrelated refactors.

### 3) Coding and safety standards
- Preserve existing architecture and naming conventions.
- Do not introduce destructive commands or irreversible operations.
- Prefer explicit error handling over silent failures.
- If something is unclear or risky, stop and ask for clarification.

### 4) Required work report (what was done)
After each completed task, the agent must provide a concise report with:
- Files changed
- What was implemented/fixed
- Validation performed (tests, typecheck, build, manual checks)
- Any known limitations or follow-ups

Use this exact output format in the final response:

```text
Summary:
- ...

Changed files:
- path/to/file.ext: short description

Validation:
- command/check: result

Notes:
- optional follow-up or risk
```

### 5) Repository work log
- Every agent should append a short START entry to `AGENT_WORKLOG.md` before beginning a task.
- Every agent should append a short DONE entry to `AGENT_WORKLOG.md` after finishing a task.
- Entry format:

```text
## YYYY-MM-DD HH:mm (local)
- Agent: <name>
- Task: START - <short task description>
- Changes: pending
- Validation: pending
- Result: in-progress

## YYYY-MM-DD HH:mm (local)
- Agent: <name>
- Task: DONE - <short task description>
- Changes: <files or "none">
- Validation: <what was checked>
- Result: <done/blocker>
```

### 6) Pull request mindset
- Focus on correctness first, then readability.
- Mention regressions or edge cases explicitly.
- If no issues found in review, say so clearly.

### 7) Multi-Agent Integrations & TypeScript typings
- **TypeScript compile safety is mandatory**: Always verify with `npm run typecheck` before finalizing your work.
- **External type declarations**: If you implement new Expo native APIs (e.g., `expo-speech` or other sensors/modules) that lack type resolutions in the local lockfile environment, declare a stub module declaration file under `src/types/` (e.g., `src/types/expo-speech.d.ts`) to avoid breaking the global build.
- **Notes & Selection Store integration**: When adding features that rely on highlighting or active scriptures, check `useSelectionStore` in `src/store/selectionStore.ts`. In `WorkspaceScreen.tsx`, starting a new note dynamically parses and pre-populates the editor with the active verse text and maps slugs to Polish abbreviations (`Rdz`, `Ps`, `J`, `Rz`). Maintain this contextual link when expanding features.

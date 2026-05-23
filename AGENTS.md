# Biblia AI — Agent Guide

## Expo version

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Architecture (SolidCode Apps)

- **Router:** `expo-router` — `app/(tabs)/` for Home, AI, Workspace; stack screens for book, reader, topic, settings.
- **Data:** `expo-sqlite` via `src/services/db/database.ts`; seed from `assets/bible-seed.json` in `seed.ts` (runs once when `books` is empty).
- **State:** Zustand stores in `src/store/` — `readerStore` (persisted font), `bookmarksStore`, `historyStore`, `aiChatStore` (persisted chat), `notesStore`, `selectionStore`, `audioStore`.
- **Errors:** `src/services/errors/errorLogger.ts` → Supabase `error_logs` (same pattern as prawojazdy); offline queue in AsyncStorage; `initializeErrorLogger()` on launch and when `AppState` is `active` (`app/_layout.tsx`).
- **AI:** `useSpiritualAssistant` — live OpenAI-compatible API when `EXPO_PUBLIC_AI_API_KEY` is set; otherwise mock replies. Quota: 20 user turns in `aiChatStore`.
- **Theme:** `@/theme` — gold-on-black Cyber-Monastery; do not add light theme without product approval.
- **Imports:** use `@/` path alias (see `tsconfig.json`).

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
- Always use Expo documentation for version `56.0.0`.
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
- Every agent should append a short entry to `AGENT_WORKLOG.md` after finishing a task.
- Entry format:

```text
## YYYY-MM-DD HH:mm (local)
- Agent: <name>
- Task: <short task description>
- Changes: <files or "none">
- Validation: <what was checked>
- Result: <done/blocker>
```

### 6) Pull request mindset
- Focus on correctness first, then readability.
- Mention regressions or edge cases explicitly.
- If no issues found in review, say so clearly.

# Plan 061: Standardize DB operation naming conventions

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/db/ src/main/ipc/ src/pipeline/ src/renderer/stores/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: readability
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

Three different verbs are used for the same INSERT operation: `store` (`storeBookmarks`, `storeClassification`, `storeSummary`, `storeHighlight`, `storeNote`, `storeArticleContent`), `create` (`createNotification`, `createChatSession`, `createTopic`, `createHashtag`, `createCustomSection`, `createImportJob`), and `save` (`saveSettings`). This inconsistency makes the API harder to learn and navigate. Standardizing to `create` for inserts and `update` for modifications makes the intent clear.

## Current state

- `src/db/bookmarks.ts` — exports `storeBookmarks`
- `src/db/classifications.ts` — exports `storeClassification`
- `src/db/summaries.ts` — exports `storeSummary`
- `src/db/highlights.ts` — exports `storeHighlight`
- `src/db/notes.ts` — exports `storeNote`
- `src/db/article-content.ts` — exports `storeArticleContent`
- `src/db/notifications.ts` — exports `createNotification` (already correct)
- `src/db/chat.ts` — exports `createChatSession` (already correct)
- `src/db/topics.ts` — exports `createTopic` (already correct)
- `src/db/hashtags.ts` — exports `createHashtag` (already correct)
- `src/db/custom-sections.ts` — exports `createCustomSection` (already correct)
- `src/db/import-jobs.ts` — exports `createImportJob` (already correct)

Convention: files in `src/db/` export functions that are called from `src/main/ipc/`, `src/pipeline/`, and `src/renderer/stores/`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/db/bookmarks.ts` — rename `storeBookmarks` → `createBookmarks`
- `src/db/classifications.ts` — rename `storeClassification` → `createClassification`
- `src/db/summaries.ts` — rename `storeSummary` → `createSummary`
- `src/db/highlights.ts` — rename `storeHighlight` → `createHighlight`
- `src/db/notes.ts` — rename `storeNote` → `createNote`
- `src/db/article-content.ts` — rename `storeArticleContent` → `createArticleContent`
- All callers of these functions

**Out of scope**:
- `saveSettings` — settings store uses `save` which is a different semantic (upsert), not just insert
- Renaming `create*` functions — they are already correct

## Steps

### Step 1: Rename `storeBookmarks` → `createBookmarks`

In `src/db/bookmarks.ts`, rename the export. Then update all callers (search for `storeBookmarks` across the codebase).

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Rename `storeClassification` → `createClassification`

In `src/db/classifications.ts`, rename the export. Then update all callers.

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Rename `storeSummary` → `createSummary`

In `src/db/summaries.ts`, rename the export. Then update all callers.

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Rename `storeHighlight` → `createHighlight`

In `src/db/highlights.ts`, rename the export. Then update all callers.

**Verify**: `pnpm typecheck` → exit 0

### Step 5: Rename `storeNote` → `createNote`

In `src/db/notes.ts`, rename the export. Then update all callers.

**Verify**: `pnpm typecheck` → exit 0

### Step 6: Rename `storeArticleContent` → `createArticleContent`

In `src/db/article-content.ts`, rename the export. Then update all callers.

**Verify**: `pnpm typecheck` → exit 0

### Step 7: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0

## Test plan

- Existing tests should continue to pass — no behavior change, only function renames
- No new tests required

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -r "function store" src/db/` returns 0 matches
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- A rename breaks an import in an out-of-scope file

## Maintenance notes

- New DB insert functions should follow the `create*` naming convention
- The `save*` prefix should only be used for upsert operations (like settings)

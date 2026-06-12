# Plan 054: Extract split-view state into dedicated Zustand store

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/renderer/stores/bookmarkStore.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Category**: readability
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

`src/renderer/stores/bookmarkStore.ts` is 396 lines handling two unrelated concerns: bookmark data (fetch, select, mock mode) and split-view UI state (columns, tabs, resize, localStorage persistence). The split-view logic (lines 117-341) is a self-contained state machine that doesn't depend on bookmark data. Extracting it into its own store follows the single-responsibility principle and makes both stores easier to reason about. Other stores already exist (`uiStore.ts`, `settingsStore.ts`) following the same pattern.

## Current state

- `src/renderer/stores/bookmarkStore.ts` — 396 lines, handles both bookmark data and split-view state
- `src/renderer/stores/uiStore.ts` — existing store (exemplar)
- `src/renderer/stores/settingsStore.ts` — existing store

**Split-view state in bookmarkStore.ts (lines 117-341)**:
- `SplitState` type and default
- `columns` state, `activeColumnId`
- `openBookmarkInColumn`, `closeColumn`, `splitColumn`, `mergeColumn`
- `resizeColumn`, `setColumnBookmark`
- Tab management (open tabs, close tabs, reopen closed)
- localStorage persistence for split state

**Bookmark data to keep in bookmarkStore.ts**:
- `bookmarks` array, `classifications`, `selectedBookmarkId`
- `fetchBookmarks`, `selectBookmark`
- Mock mode

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/renderer/stores/bookmarkStore.ts`
- New: `src/renderer/stores/splitStore.ts`

**Out of scope**:
- Components that consume the store (they'll need import path updates — that's a follow-up)
- `src/renderer/stores/uiStore.ts`, `src/renderer/stores/settingsStore.ts`

## Steps

### Step 1: Create src/renderer/stores/splitStore.ts

Create a new Zustand store with the extracted split-view state. Follow the pattern from `uiStore.ts`:

```typescript
import { create } from 'zustand';

// Move SplitState type here
// Move defaultSplitState here
// Move all split-view actions here
// Move localStorage persistence logic here
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Remove split-view code from bookmarkStore.ts

Remove the split-view state, actions, and localStorage persistence from `bookmarkStore.ts`. Keep only bookmark data (bookmarks, classifications, selectedBookmarkId, fetchBookmarks, selectBookmark, mock mode).

**Verify**: `pnpm typecheck` → will likely show errors in components that import split-view state from bookmarkStore — this is expected and will be fixed in a follow-up

### Step 3: Update bookmarkStore to re-export from splitStore

Add re-exports from `splitStore` in `bookmarkStore.ts` so existing component imports don't break:

```typescript
export { useSplitStore } from './splitStore';
// Or re-export specific selectors/actions as needed
```

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0, all pass

## Test plan

- Existing tests should continue to pass
- No new tests needed — this is a structural refactor

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `bookmarkStore.ts` is under 200 lines
- [ ] `splitStore.ts` contains all split-view logic (columns, tabs, resize, persistence)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The refactor requires changing component prop types (indicates cross-store coupling that needs design discussion)
- The split-view state has hidden dependencies on bookmark data

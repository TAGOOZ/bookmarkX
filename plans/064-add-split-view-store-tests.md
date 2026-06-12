# Plan 064: Add bookmarkStore split-view unit tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/renderer/stores/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: test-coverage
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

`src/renderer/stores/bookmarkStore.ts` contains 280+ lines of split-view state management (columns, tabs, resize, open/close/split/merge) with zero tests. This is a complex state machine where regressions are invisible. Adding tests ensures that split-view behavior remains correct as the codebase evolves.

## Current state

- `src/renderer/stores/bookmarkStore.ts` — split-view state management (280+ lines)
- `src/renderer/stores/__tests__/bookmarkStore.test.ts` — tests basic bookmark operations
- `src/db/__tests__/*.test.ts` — shows the project's test style

Convention: tests use `describe`/`it` blocks, mock external dependencies, and follow the project's existing test patterns.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/renderer/stores/__tests__/splitStore.test.ts` (new, or extend `bookmarkStore.test.ts`)

**Out of scope**:
- Components
- Other store files

## Steps

### Step 1: Create test file for split-view state

Create `src/renderer/stores/__tests__/splitStore.test.ts` (or extend `bookmarkStore.test.ts` if appropriate). Set up the test file with necessary imports and mocks.

**Verify**: `pnpm test -- splitStore` → test file is discovered (may fail with 0 tests initially)

### Step 2: Test `openBookmarkInColumn`

Test cases:
- Opens a new bookmark in a new column when no columns exist
- Opens a bookmark in an existing column if the bookmark is already open
- Creates a new column if bookmark is not already open
- Respects MAX_COLUMNS limit (replaces active column's bookmark)

**Verify**: `pnpm test -- splitStore` → new tests pass

### Step 3: Test `closeColumn`

Test cases:
- Removes a column from the state
- Merges with adjacent column if closing the last tab in a column
- Updates activeColumnId when the active column is closed

**Verify**: `pnpm test -- splitStore` → new tests pass

### Step 4: Test `splitColumn`

Test cases:
- Duplicates a column with the same bookmark
- Respects MAX_COLUMNS limit (does not split if already at max)
- Inserts the new column after the source column

**Verify**: `pnpm test -- splitStore` → new tests pass

### Step 5: Test `resizeColumn`

Test cases:
- Updates column width
- Respects 300px minimum width constraint
- Updates adjacent column width proportionally

**Verify**: `pnpm test -- splitStore` → new tests pass

### Step 6: Test column limit enforcement

Test cases:
- Cannot exceed MAX_COLUMNS (3)
- When at MAX_COLUMNS, selecting a new bookmark replaces active column

**Verify**: `pnpm test -- splitStore` → new tests pass

### Step 7: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0

## Test plan

- At least 15 new split-view tests in `src/renderer/stores/__tests__/splitStore.test.ts`
- Model after existing `src/renderer/stores/__tests__/bookmarkStore.test.ts`
- Tests cover: openBookmarkInColumn, closeColumn, splitColumn, resizeColumn, column limit enforcement, localStorage persistence

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] At least 15 split-view tests exist and pass
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The test framework cannot be determined from existing test files

## Maintenance notes

- When adding new split-view features, add corresponding tests to this file
- If plan 054 lands and creates `splitStore.test.ts`, extend it instead of creating a new file

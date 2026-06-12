# Plan 028: Fix openBookmarks to track all open tabs globally across columns

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a7e3553..HEAD -- src/renderer/stores/bookmarkStore.ts src/renderer/components/split-view/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plan 027
- **Category**: bug
- **Planned at**: commit `a7e3553`, 2026-06-12

## Why this matters

`openBookmarks` is a flat list of all open bookmarks, but column operations
(remove column, merge column, close tab) remove bookmarks from this list
aggressively. If bookmark A is open in column 1 and you close column 1,
bookmark A is removed from `openBookmarks` even if it's still referenced
elsewhere. This causes tabs to disappear unexpectedly and leaves columns
pointing at stale bookmark IDs. The fix: `openBookmarks` should only lose a
bookmark when NO column references it.

## Current state

- `src/renderer/stores/bookmarkStore.ts` — `handleMergeColumn` (lines 171-203) and `handleTabCloseTab` (added in plan 027) both filter `openBookmarks` by the closed bookmark ID
- `src/renderer/components/split-view/SplitLayout.tsx` — `columnBookmarks` (line 90-92) filters `openBookmarks` per column

The problem in `handleMergeColumn`:
```tsx
const col = state.splitState.columns.find((c) => c.id === columnId);
const newOpen = col?.bookmarkId
  ? state.openBookmarks.filter((b) => b.id !== col.bookmarkId)
  : state.openBookmarks;
```
This removes the bookmark from the global list without checking if another column still references it.

Convention: all split state changes go through `saveSplitState()` for localStorage persistence.

## Commands you will need

| Purpose   | Command                    | Expected on success |
|-----------|----------------------------|---------------------|
| Typecheck | `pnpm typecheck`           | exit 0, no errors   |
| Tests     | `pnpm test`                | all pass            |
| Lint      | `pnpm lint`                | exit 0              |

## Scope

**In scope**:
- `src/renderer/stores/bookmarkStore.ts` — fix `handleMergeColumn` and `handleTabCloseTab`

**Out of scope**:
- `SplitLayout.tsx` — no changes needed, it already filters correctly
- `BookmarkTabs.tsx` — unchanged

## Git workflow

- Commit: `fix(ui): only remove bookmark from openBookmarks when no column references it`

## Steps

### Step 1: Add helper to compute openBookmarks from columns

In `bookmarkStore.ts`, add a helper function at the top of the file (after imports, before the store):

```tsx
function computeOpenBookmarks(
  columns: SplitColumn[],
  bookmarks: Bookmark[],
): Bookmark[] {
  // Collect all bookmark IDs still referenced by any column
  const referencedIds = new Set(
    columns
      .map((c) => c.bookmarkId)
      .filter((id): id is string => id !== null),
  );
  // Keep only bookmarks that are still referenced
  return bookmarks.filter((b) => referencedIds.has(b.id));
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Fix handleMergeColumn to use helper

Replace the `openBookmarks` filtering logic in `handleMergeColumn`:

Before:
```tsx
const col = state.splitState.columns.find((c) => c.id === columnId);
const newOpen = col?.bookmarkId
  ? state.openBookmarks.filter((b) => b.id !== col.bookmarkId)
  : state.openBookmarks;
const remaining = state.splitState.columns.filter((c) => c.id !== columnId);
```

After:
```tsx
const remaining = state.splitState.columns.filter((c) => c.id !== columnId);
const newOpen = computeOpenBookmarks(remaining, state.openBookmarks);
```

Apply this pattern to ALL three return paths in `handleMergeColumn`:
1. The single-column case (line 174-180)
2. The allEmpty case (line 188-194)
3. The normal case (line 196-202)

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Fix handleTabCloseTab (from plan 027) to use helper

Replace the `openBookmarks` filtering in `handleTabCloseTab`:

Before:
```tsx
const newOpen = state.openBookmarks.filter((b) => b.id !== bookmarkId);
```

After:
```tsx
const newOpen = computeOpenBookmarks(newColumns, state.openBookmarks);
```

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Fix handleBookmarkSelect to deduplicate

Currently `handleBookmarkSelect` (line 97-137) adds a bookmark to `openBookmarks` if not present. This is correct. But if a bookmark is already in `openBookmarks` but its column was removed, it should still be kept. The current logic handles this. No change needed here — just verify.

**Verify**: `pnpm typecheck` → exit 0

### Step 5: Run tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- Existing tests should pass
- Plan 031 will add tests for the specific scenario: bookmark open in two columns, close one column → bookmark stays in openBookmarks

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] Closing a column that has a bookmark also open in another column does NOT remove it from openBookmarks
- [ ] Closing the last column referencing a bookmark DOES remove it from openBookmarks
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The helper function approach doesn't work because of circular dependencies

## Maintenance notes

- If columns ever support multiple tabs (tab bar per column), `computeOpenBookmarks` must be updated to check ALL tab IDs, not just `column.bookmarkId`
- The `openBookmarks` list is a derived value — ideally it would be a selector, not stored state. That refactor is out of scope.

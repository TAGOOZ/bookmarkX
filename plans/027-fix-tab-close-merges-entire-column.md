# Plan 027: Fix tab close to remove single tab instead of merging entire column

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a7e3553..HEAD -- src/renderer/components/split-view/SplitLayout.tsx src/renderer/stores/bookmarkStore.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `a7e3553`, 2026-06-12

## Why this matters

When a user closes a single tab in a column that has multiple tabs open, the
entire column is destroyed instead of just removing that one tab. This happens
because `handleTabClose` in SplitLayout unconditionally calls `onMergeColumn`,
which removes the column entirely. The expected behavior is: close one tab →
remove that tab from the column → if column becomes empty, then merge.

## Current state

- `src/renderer/components/split-view/SplitLayout.tsx` — the split view that renders BookmarkTabs per column
- `src/renderer/stores/bookmarkStore.ts` — the Zustand store managing `openBookmarks` and `splitState`

Relevant code in `SplitLayout.tsx:29-31`:
```tsx
const handleTabClose = useCallback((columnId: string, _bookmarkId: string) => {
  onMergeColumn(columnId);
}, [onMergeColumn]);
```

The `_bookmarkId` parameter is received but ignored. `onMergeColumn` in
`bookmarkStore.ts:171-203` removes the entire column or clears its bookmark.

Relevant code in `bookmarkStore.ts:171-203`:
```tsx
handleMergeColumn: (columnId) => {
  set((state) => {
    if (state.splitState.columns.length === 0) return state;
    if (state.splitState.columns.length === 1) {
      const newSplit: SplitState = {
        columns: [{ ...state.splitState.columns[0], bookmarkId: null }],
        activeColumnId: state.splitState.columns[0].id,
      };
      saveSplitState(newSplit);
      return { splitState: newSplit };
    }
    const col = state.splitState.columns.find((c) => c.id === columnId);
    const newOpen = col?.bookmarkId
      ? state.openBookmarks.filter((b) => b.id !== col.bookmarkId)
      : state.openBookmarks;
    const remaining = state.splitState.columns.filter((c) => c.id !== columnId);
    // ... rest removes column
  });
},
```

Convention: store actions use `set((state) => ...)` pattern. All state changes
go through `saveSplitState()` for persistence. Match existing style.

## Commands you will need

| Purpose   | Command                    | Expected on success |
|-----------|----------------------------|---------------------|
| Typecheck | `pnpm typecheck`           | exit 0, no errors   |
| Tests     | `pnpm test`                | all pass            |
| Lint      | `pnpm lint`                | exit 0              |

## Scope

**In scope**:
- `src/renderer/stores/bookmarkStore.ts` — add `handleTabClose` action
- `src/renderer/components/split-view/SplitLayout.tsx` — wire new action

**Out of scope**:
- `BookmarkTabs.tsx` — its `onTabClose` prop contract stays the same
- No changes to `openBookmarks` global list (that's plan 028)

## Git workflow

- Commit: `fix(ui): close single tab instead of merging entire column`

## Steps

### Step 1: Add `handleTabCloseTab` action to bookmarkStore

In `src/renderer/stores/bookmarkStore.ts`, add a new action `handleTabCloseTab`
to the `BookmarkStore` interface and implementation.

Interface addition (~line 49, after `handleColumnResize`):
```tsx
handleTabCloseTab: (columnId: string, bookmarkId: string) => void;
```

Implementation (after `handleMergeColumn`, ~line 203):
```tsx
handleTabCloseTab: (columnId, bookmarkId) => {
  set((state) => {
    const col = state.splitState.columns.find((c) => c.id === columnId);
    if (!col) return state;

    // If column has only one bookmark or none, merge the column
    if (state.splitState.columns.length === 1) {
      const newSplit: SplitState = {
        columns: [{ ...col, bookmarkId: null }],
        activeColumnId: col.id,
      };
      const newOpen = state.openBookmarks.filter((b) => b.id !== bookmarkId);
      saveSplitState(newSplit);
      return { splitState: newSplit, openBookmarks: newOpen };
    }

    // Remove the bookmark from this column only
    const newColumns = state.splitState.columns.map((c) =>
      c.id === columnId ? { ...c, bookmarkId: null } : c,
    );

    // Remove bookmark from openBookmarks
    const newOpen = state.openBookmarks.filter((b) => b.id !== bookmarkId);

    // If the closed tab was the active column, activate the first non-empty column
    let newActiveId = state.splitState.activeColumnId;
    if (newActiveId === columnId) {
      const firstWithBookmark = newColumns.find((c) => c.bookmarkId);
      newActiveId = firstWithBookmark?.id ?? newColumns[0].id;
    }

    const newSplit: SplitState = { columns: newColumns, activeColumnId: newActiveId };
    saveSplitState(newSplit);
    return { splitState: newSplit, openBookmarks: newOpen };
  });
},
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Wire SplitLayout to use new action

In `src/renderer/components/split-view/SplitLayout.tsx`:

1. The `onTabClose` prop type in `SplitLayoutProps` (`types.ts:17`) already receives `(columnId, bookmarkId)` — it's just that the current implementation ignores `bookmarkId`. No prop change needed.

2. Change the `handleTabClose` callback in `SplitLayout.tsx:29-31` from:
```tsx
const handleTabClose = useCallback((columnId: string, _bookmarkId: string) => {
  onMergeColumn(columnId);
}, [onMergeColumn]);
```
to:
```tsx
const handleTabClose = useCallback((columnId: string, bookmarkId: string) => {
  onMergeColumn(columnId, bookmarkId);
}, [onMergeColumn]);
```

3. Update `SplitLayoutProps` in `src/renderer/components/split-view/types.ts:17`:
```tsx
onMergeColumn: (columnId: string, bookmarkId?: string) => void;
```

4. Update `bookmarkStore.ts` — `handleMergeColumn` signature to accept optional `bookmarkId`:
```tsx
handleMergeColumn: (columnId, bookmarkId?) => {
```
When `bookmarkId` is provided, use it instead of `col.bookmarkId` for the openBookmarks filter. When omitted, keep existing behavior (for backward compat with other callers).

Actually, cleaner approach: have `SplitLayout` call `handleTabCloseTab` directly instead of `handleMergeColumn`. Add `handleTabCloseTab` to the props:

In `types.ts`:
```tsx
onTabCloseTab: (columnId: string, bookmarkId: string) => void;
```

In `SplitLayout.tsx`:
```tsx
const handleTabClose = useCallback((columnId: string, bookmarkId: string) => {
  onTabCloseTab(columnId, bookmarkId);
}, [onTabCloseTab]);
```

In `App.tsx` — add the new store function and pass it:
```tsx
const handleTabCloseTab = useBookmarkStore((s) => s.handleTabCloseTab);
// ... pass to SplitLayout
onTabCloseTab={handleTabCloseTab}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Run tests

**Verify**: `pnpm test` → all pass

### Step 4: Run lint

**Verify**: `pnpm lint` → exit 0

## Test plan

- Existing tests in `SplitLayout.test.tsx` should still pass (they test `onMergeColumn` via drag-to-edge, not tab close)
- No new tests needed for this plan — the behavior is tested implicitly when plan 031 adds tab-close tests

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] Closing a tab in a multi-tab column only removes that tab, not the whole column
- [ ] Closing the last tab in a column still removes/clears the column
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The fix appears to require touching an out-of-scope file beyond App.tsx wiring

## Maintenance notes

- If multi-tab-per-column support is extended (e.g., tab reorder), this close logic must be revisited
- The `handleMergeColumn` function is still used by other paths (e.g., close-all, programmatic merge) — don't remove it

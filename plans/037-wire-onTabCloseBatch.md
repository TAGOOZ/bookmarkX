# Plan 037: Wire onTabCloseBatch from SplitLayout to BookmarkTabs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 00e273e..HEAD -- src/renderer/components/split-view/SplitLayout.tsx src/renderer/components/split-view/types.ts src/renderer/App.tsx src/renderer/stores/bookmarkStore.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `00e273e`, 2026-06-12

## Why this matters

`BookmarkTabs` has `onTabCloseBatch` as an optional prop for batch close
operations (close all, close right, close left, close others). When not
provided, it falls back to calling `onTabClose` in a loop — causing N
separate state updates and N re-renders instead of 1 batch update. This
also means each close individually removes the bookmark from `openBookmarks`,
which can cause stale intermediate states.

SplitLayout currently doesn't pass `onTabCloseBatch`, so every batch
close operation is inefficient and potentially racy.

## Current state

- `src/renderer/components/split-view/SplitLayout.tsx` — renders BookmarkTabs (lines 126-134) without `onTabCloseBatch`
- `src/renderer/components/split-view/types.ts` — `SplitLayoutProps` (lines 15-25) doesn't include `onTabCloseBatch`
- `src/renderer/stores/bookmarkStore.ts` — has `handleTabCloseTab` (lines 220-251) for single close, no batch action
- `src/renderer/App.tsx` — passes store actions to SplitLayout (lines 95-105)

SplitLayout BookmarkTabs rendering:
```tsx
<BookmarkTabs
  openBookmarks={columnBookmarks}
  activeBookmarkId={column.bookmarkId}
  onTabSelect={(id) => handleBookmarkSelect(column.id, id)}
  onTabClose={(id) => handleTabClose(column.id, id)}
  onSplitColumn={(id) => onSplitColumn(column.id, id)}
  columnId={column.id}
  dir={dir}
/>
```

BookmarkTabs batch close fallback (e.g., handleMenuCloseAll):
```tsx
if (onTabCloseBatch) {
  onTabCloseBatch(ids);
} else {
  ids.forEach((id) => onTabClose(id));
}
```

Convention: store actions use `set((state) => ...)` pattern. All state changes
go through `saveSplitState()` for persistence.

## Commands you will need

| Purpose   | Command                    | Expected on success |
|-----------|----------------------------|---------------------|
| Typecheck | `pnpm typecheck`           | exit 0, no errors   |
| Tests     | `pnpm test`                | all pass            |
| Lint      | `pnpm lint`                | exit 0              |

## Scope

**In scope**:
- `src/renderer/stores/bookmarkStore.ts` — add `handleTabCloseBatch` action
- `src/renderer/components/split-view/types.ts` — add `onTabCloseBatch` prop
- `src/renderer/components/split-view/SplitLayout.tsx` — wire new action
- `src/renderer/App.tsx` — pass new action to SplitLayout

**Out of scope**:
- `BookmarkTabs.tsx` — its `onTabCloseBatch` prop contract stays the same
- No changes to context menu logic (already correct)

## Git workflow

- Commit: `fix(ui): wire batch tab close through store for single state update`

## Steps

### Step 1: Add handleTabCloseBatch action to bookmarkStore

In `src/renderer/stores/bookmarkStore.ts`, add to the `BookmarkStore` interface:
```tsx
handleTabCloseBatch: (columnId: string, bookmarkIds: string[]) => void;
```

Add implementation after `handleTabCloseTab`:
```tsx
handleTabCloseBatch: (columnId, bookmarkIds) => {
  set((state) => {
    const idsToRemove = new Set(bookmarkIds);

    // Clear the column if its bookmark is in the batch
    const col = state.splitState.columns.find((c) => c.id === columnId);
    const shouldClearColumn = col?.bookmarkId && idsToRemove.has(col.bookmarkId);

    const newColumns = shouldClearColumn
      ? state.splitState.columns.map((c) =>
          c.id === columnId ? { ...c, bookmarkId: null } : c,
        )
      : state.splitState.columns;

    // Compute openBookmarks from remaining column references
    const newOpen = computeOpenBookmarks(newColumns, state.openBookmarks);

    // If we cleared the active column, activate the first with a bookmark
    let newActiveId = state.splitState.activeColumnId;
    if (shouldClearColumn) {
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

### Step 2: Add onTabCloseBatch to SplitLayoutProps

In `src/renderer/components/split-view/types.ts`, add to `SplitLayoutProps`:
```tsx
onTabCloseBatch?: (columnId: string, bookmarkIds: string[]) => void;
```

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Wire SplitLayout to pass onTabCloseBatch

In `src/renderer/components/split-view/SplitLayout.tsx`:

1. Add `onTabCloseBatch` to the destructured props (line 12-22):
```tsx
const SplitLayout: React.FC<SplitLayoutProps> = ({
  splitState,
  openBookmarks,
  onSplitColumn,
  onMergeColumn,
  onTabCloseTab,
  onTabCloseBatch,  // add this
  onColumnActive,
  onColumnResize,
  onBookmarkChange,
  dir,
}) => {
```

2. Pass it to BookmarkTabs (line 126-134):
```tsx
<BookmarkTabs
  openBookmarks={columnBookmarks}
  activeBookmarkId={column.bookmarkId}
  onTabSelect={(id) => handleBookmarkSelect(column.id, id)}
  onTabClose={(id) => handleTabClose(column.id, id)}
  onTabCloseBatch={onTabCloseBatch ? (ids) => onTabCloseBatch(column.id, ids) : undefined}
  onSplitColumn={(id) => onSplitColumn(column.id, id)}
  columnId={column.id}
  dir={dir}
/>
```

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Wire App.tsx to pass the store action

In `src/renderer/App.tsx`, add the store selector:
```tsx
const handleTabCloseBatch = useBookmarkStore((s) => s.handleTabCloseBatch);
```

Pass to SplitLayout:
```tsx
<SplitLayout
  ...
  onTabCloseBatch={handleTabCloseBatch}
  ...
/>
```

**Verify**: `pnpm typecheck` → exit 0

### Step 5: Run tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- Existing tests should pass
- Store tests in `bookmarkStore.test.ts` can be extended to test `handleTabCloseBatch`:
  - Batch close removes bookmarks from openBookmarks
  - Batch close clears the column if its bookmark is in the batch
  - Batch close does not clear columns whose bookmarks are not in the batch

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] Batch close operations (close all, close right/left, close others) result in a single state update
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt

## Maintenance notes

- If multi-tab-per-column support is added later, `handleTabCloseBatch` must handle clearing multiple bookmarks per column
- The `computeOpenBookmarks` helper (from plan 028) handles the derivation correctly

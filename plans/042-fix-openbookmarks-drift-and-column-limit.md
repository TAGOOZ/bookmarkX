# Plan 042: Fix split view openBookmarks drift and column limit validation

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 00e273e..HEAD -- src/renderer/stores/bookmarkStore.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `00e273e`, 2026-06-12

## Why this matters

Three related bugs cause the split view to malfunction:

1. **`openBookmarks` grows with stale entries**: `handleBookmarkSelect` adds
   bookmarks to `openBookmarks` but never removes old ones when replacing a
   column's bookmark. At MAX_COLUMNS, the `else` branch replaces the column's
   `bookmarkId` but the old bookmark stays in `openBookmarks`. Over time,
   `openBookmarks` accumulates entries that no column references, causing
   memory waste and potential stale data in `getActiveBookmark()`.

2. **`handleSplitColumn` doesn't update `openBookmarks`**: When splitting a
   column, the new bookmark should be in `openBookmarks`, but
   `handleSplitColumn` only updates `splitState`. If the bookmark was
   previously closed (removed from `openBookmarks`), the column references a
   bookmark not in `openBookmarks`, causing `columnBookmarks` to be empty and
   the BookmarkTabs to show no tab.

3. **`loadSplitState()` doesn't validate MAX_COLUMNS**: The function loads
   from localStorage without checking column count. A stale state from a
   previous version could have >3 columns, bypassing the MAX_COLUMNS guard.

## Current state

- `src/renderer/stores/bookmarkStore.ts` — `handleBookmarkSelect` (lines 110-150),
  `handleSplitColumn` (lines 163-181), `loadSplitState` (lines 23-33)

Key code in `handleBookmarkSelect`:
```tsx
handleBookmarkSelect: (bookmark) => {
  const { openBookmarks, splitState } = get();
  const exists = openBookmarks.find((b) => b.id === bookmark.id);
  const newOpen = exists ? openBookmarks : [...openBookmarks, bookmark];

  let newSplit: SplitState;
  const activeCol = splitState.columns.find((c) => c.id === splitState.activeColumnId);
  // ... conditions ...
  } else {
    // At MAX_COLUMNS — replaces active column's bookmark
    newSplit = {
      ...splitState,
      columns: splitState.columns.map((c) =>
        c.id === activeCol.id ? { ...c, bookmarkId: bookmark.id } : c,
      ),
      activeColumnId: activeCol.id,
    };
  }
  // BUG: old bookmark stays in openBookmarks
  set({ openBookmarks: newOpen, splitState: newSplit });
},
```

Key code in `handleSplitColumn`:
```tsx
handleSplitColumn: (columnId, bookmarkId) => {
  set((state) => {
    if (state.splitState.columns.length >= MAX_COLUMNS) return state;
    // ... creates new column ...
    // BUG: doesn't add bookmark to openBookmarks
    return { splitState: newSplit };
  });
},
```

Key code in `loadSplitState`:
```tsx
function loadSplitState(): SplitState | null {
  try {
    const raw = localStorage.getItem(SPLIT_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // BUG: doesn't validate columns.length <= MAX_COLUMNS
    if (parsed?.columns?.length > 0 && parsed?.activeColumnId) return parsed;
  } catch { return []; }
  return null;
}
```

Convention: store actions use `set((state) => ...)` pattern. All state changes
go through `saveSplitState()` for persistence. The `computeOpenBookmarks`
helper (lines 11-21) derives `openBookmarks` from columns — use it.

## Commands you will need

| Purpose   | Command                    | Expected on success |
|-----------|----------------------------|---------------------|
| Typecheck | `pnpm typecheck`           | exit 0, no errors   |
| Tests     | `pnpm test`                | all pass            |
| Lint      | `pnpm lint`                | exit 0              |

## Scope

**In scope**:
- `src/renderer/stores/bookmarkStore.ts` — fix all three bugs

**Out of scope**:
- SplitLayout.tsx — no changes needed
- BookmarkTabs.tsx — unchanged
- CSS changes — none

## Git workflow

- Commit: `fix(ui): fix openBookmarks drift and validate column limit on load`

## Steps

### Step 1: Fix `loadSplitState` to validate MAX_COLUMNS

In `bookmarkStore.ts`, update `loadSplitState` (lines 23-33):

Before:
```tsx
function loadSplitState(): SplitState | null {
  try {
    const raw = localStorage.getItem(SPLIT_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.columns?.length > 0 && parsed?.activeColumnId) return parsed;
  } catch {
    return [];
  }
  return null;
}
```

After:
```tsx
function loadSplitState(): SplitState | null {
  try {
    const raw = localStorage.getItem(SPLIT_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.columns?.length > 0 && parsed?.activeColumnId) {
      // Truncate to MAX_COLUMNS if stale state has too many
      if (parsed.columns.length > MAX_COLUMNS) {
        parsed.columns = parsed.columns.slice(0, MAX_COLUMNS);
      }
      return parsed;
    }
  } catch {
    // localStorage may be unavailable
  }
  return null;
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Fix `handleBookmarkSelect` to clean up stale bookmarks

Replace the entire `handleBookmarkSelect` implementation to use
`computeOpenBookmarks` for deriving `openBookmarks` from the new columns:

Before (lines 110-150):
```tsx
handleBookmarkSelect: (bookmark) => {
  const { openBookmarks, splitState } = get();
  const exists = openBookmarks.find((b) => b.id === bookmark.id);
  const newOpen = exists ? openBookmarks : [...openBookmarks, bookmark];
  // ... column logic ...
  set({ openBookmarks: newOpen, splitState: newSplit });
},
```

After:
```tsx
handleBookmarkSelect: (bookmark) => {
  const { splitState } = get();

  let newSplit: SplitState;
  const activeCol = splitState.columns.find((c) => c.id === splitState.activeColumnId);
  if (!activeCol) {
    newSplit = splitState;
  } else if (activeCol.bookmarkId === bookmark.id) {
    newSplit = splitState;
  } else if (!activeCol.bookmarkId) {
    newSplit = {
      ...splitState,
      columns: splitState.columns.map((c) =>
        c.id === activeCol.id ? { ...c, bookmarkId: bookmark.id } : c,
      ),
    };
  } else if (splitState.columns.length < MAX_COLUMNS) {
    const newCol: SplitColumn = {
      id: `col-${Date.now()}`,
      bookmarkId: bookmark.id,
      width: 1,
    };
    newSplit = {
      columns: [...splitState.columns, newCol],
      activeColumnId: newCol.id,
    };
  } else {
    newSplit = {
      ...splitState,
      columns: splitState.columns.map((c) =>
        c.id === activeCol.id ? { ...c, bookmarkId: bookmark.id } : c,
      ),
      activeColumnId: activeCol.id,
    };
  }

  // Derive openBookmarks from columns — ensures only referenced bookmarks are kept
  // But also ensure the newly selected bookmark is included (it may not be in a column yet)
  const newOpen = (() => {
    const fromColumns = computeOpenBookmarks(newSplit.columns, get().openBookmarks);
    // If the bookmark is already referenced by a column, the computed list is correct
    if (newSplit.columns.some((c) => c.bookmarkId === bookmark.id)) {
      return fromColumns;
    }
    // Otherwise, add it (shouldn't happen normally, but defensive)
    if (fromColumns.some((b) => b.id === bookmark.id)) return fromColumns;
    return [...fromColumns, bookmark];
  })();

  saveSplitState(newSplit);
  set({ openBookmarks: newOpen, splitState: newSplit });
},
```

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Fix `handleSplitColumn` to add bookmark to `openBookmarks`

In `handleSplitColumn` (lines 163-181), update to also add the bookmark to
`openBookmarks`:

Before:
```tsx
handleSplitColumn: (columnId, bookmarkId) => {
  set((state) => {
    if (state.splitState.columns.length >= MAX_COLUMNS) return state;
    const sourceCol = state.splitState.columns.find((c) => c.id === columnId);
    if (!sourceCol) return state;
    const newCol: SplitColumn = {
      id: `col-${Date.now()}`,
      bookmarkId,
      width: 1,
    };
    const newCols = state.splitState.columns.map((c) =>
      c.id === columnId ? { ...c, width: c.width } : c,
    );
    const idx = newCols.findIndex((c) => c.id === columnId);
    newCols.splice(idx + 1, 0, newCol);
    const newSplit = { columns: newCols, activeColumnId: newCol.id };
    saveSplitState(newSplit);
    return { splitState: newSplit };
  });
},
```

After:
```tsx
handleSplitColumn: (columnId, bookmarkId) => {
  set((state) => {
    if (state.splitState.columns.length >= MAX_COLUMNS) return state;
    const sourceCol = state.splitState.columns.find((c) => c.id === columnId);
    if (!sourceCol) return state;
    const newCol: SplitColumn = {
      id: `col-${Date.now()}`,
      bookmarkId,
      width: 1,
    };
    const newCols = state.splitState.columns.map((c) =>
      c.id === columnId ? { ...c, width: c.width } : c,
    );
    const idx = newCols.findIndex((c) => c.id === columnId);
    newCols.splice(idx + 1, 0, newCol);
    const newSplit = { columns: newCols, activeColumnId: newCol.id };
    // Ensure the bookmark is in openBookmarks
    const bookmark = state.openBookmarks.find((b) => b.id === bookmarkId);
    const newOpen = bookmark
      ? state.openBookmarks
      : (() => {
          // Bookmark not in openBookmarks — need to find it from bookmarks list
          // For now, create a minimal entry. The store's bookmarks list should have it.
          const full = state.bookmarks.find((b) => b.id === bookmarkId);
          return full ? [...state.openBookmarks, full] : state.openBookmarks;
        })();
    saveSplitState(newSplit);
    return { splitState: newSplit, openBookmarks: newOpen };
  });
},
```

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Add guard in `handleBookmarkSelect` to prevent column count > MAX_COLUMNS

Add a safety check at the top of `handleBookmarkSelect`:
```tsx
// Safety: truncate columns if somehow > MAX_COLUMNS
if (splitState.columns.length > MAX_COLUMNS) {
  const truncated = {
    ...splitState,
    columns: splitState.columns.slice(0, MAX_COLUMNS),
  };
  saveSplitState(truncated);
  set({ splitState: truncated });
  return;
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 5: Run tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- Add test in `bookmarkStore.test.ts`:
  - `handleBookmarkSelect` at MAX_COLUMNS replaces active column, old bookmark removed from `openBookmarks`
  - `handleSplitColumn` adds bookmark to `openBookmarks` if not already present
  - `loadSplitState` truncates to MAX_COLUMNS if stored state has more

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `openBookmarks` only contains bookmarks referenced by columns
- [ ] `loadSplitState` truncates to MAX_COLUMNS
- [ ] `handleSplitColumn` ensures bookmark is in `openBookmarks`
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt

## Maintenance notes

- The `computeOpenBookmarks` helper is the single source of truth for deriving
  `openBookmarks` from columns. All store actions that modify columns should
  use it. If multi-tab-per-column is added later, `computeOpenBookmarks` must
  be updated to check ALL tab IDs, not just `column.bookmarkId`.
- The `handleBookmarkSelect` function now derives `openBookmarks` from columns,
  which is the correct pattern. Previously it mutated `openBookmarks` directly,
  causing drift.

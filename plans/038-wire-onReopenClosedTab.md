# Plan 038: Wire onReopenClosedTab from SplitLayout to BookmarkTabs

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

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `00e273e`, 2026-06-12

## Why this matters

The "Reopen Closed Tab" context menu item is rendered but `onReopenClosedTab`
is never passed from any parent. The button shows (disabled when no closed
tabs exist), but clicking it when closed tabs exist does nothing. This makes
a visible UI feature silently broken.

## Current state

- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — `handleMenuReopen` (lines 194-206) checks `onReopenClosedTab` before calling it
- `src/renderer/components/split-view/SplitLayout.tsx` — renders BookmarkTabs (lines 126-134) without `onReopenClosedTab`
- `src/renderer/stores/bookmarkStore.ts` — has `handleBookmarkSelect` which can open a bookmark by ID

BookmarkTabs reopen handler:
```tsx
const handleMenuReopen = useCallback(() => {
  const last = closedTabs[0];
  if (last && onReopenClosedTab) {
    const alreadyOpen = openBookmarks.some((b) => b.id === last.id);
    if (!alreadyOpen) {
      onReopenClosedTab(last);
    }
    setClosedTabs((prev) => prev.slice(1));
  }
  setContextMenu(null);
}, [closedTabs, onReopenClosedTab, openBookmarks]);
```

The store's `handleBookmarkSelect` already handles adding a bookmark to
openBookmarks and creating a new column if needed.

## Commands you will need

| Purpose   | Command                    | Expected on success |
|-----------|----------------------------|---------------------|
| Typecheck | `pnpm typecheck`           | exit 0, no errors   |
| Tests     | `pnpm test`                | all pass            |
| Lint      | `pnpm lint`                | exit 0              |

## Scope

**In scope**:
- `src/renderer/components/split-view/types.ts` — add `onReopenClosedTab` prop
- `src/renderer/components/split-view/SplitLayout.tsx` — wire the prop
- `src/renderer/App.tsx` — pass `handleBookmarkSelect` as the reopen handler

**Out of scope**:
- `BookmarkTabs.tsx` — its `onReopenClosedTab` prop contract stays the same
- Store changes — `handleBookmarkSelect` already does what we need

## Git workflow

- Commit: `fix(ui): wire reopen closed tab through to store`

## Steps

### Step 1: Add onReopenClosedTab to SplitLayoutProps

In `src/renderer/components/split-view/types.ts`, add to `SplitLayoutProps`:
```tsx
onReopenClosedTab?: (bookmark: import('../bookmark-detail/BookmarkTabs').Bookmark) => void;
```

Wait — the `Bookmark` type is imported from `../../types`. Use:
```tsx
import type { Bookmark } from '../../types';
```

Actually, `types.ts` already imports `Bookmark`:
```tsx
import type { Bookmark } from '../../types';
```

Add to SplitLayoutProps:
```tsx
onReopenClosedTab?: (bookmark: Bookmark) => void;
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Wire SplitLayout to pass onReopenClosedTab

In `src/renderer/components/split-view/SplitLayout.tsx`:

1. Add `onReopenClosedTab` to the destructured props:
```tsx
const SplitLayout: React.FC<SplitLayoutProps> = ({
  splitState,
  openBookmarks,
  onSplitColumn,
  onMergeColumn,
  onTabCloseTab,
  onTabCloseBatch,
  onReopenClosedTab,  // add this
  onColumnActive,
  onColumnResize,
  onBookmarkChange,
  dir,
}) => {
```

2. Pass it to BookmarkTabs (inside the column loop):
```tsx
<BookmarkTabs
  openBookmarks={columnBookmarks}
  activeBookmarkId={column.bookmarkId}
  onTabSelect={(id) => handleBookmarkSelect(column.id, id)}
  onTabClose={(id) => handleTabClose(column.id, id)}
  onTabCloseBatch={onTabCloseBatch ? (ids) => onTabCloseBatch(column.id, ids) : undefined}
  onReopenClosedTab={onReopenClosedTab}
  onSplitColumn={(id) => onSplitColumn(column.id, id)}
  columnId={column.id}
  dir={dir}
/>
```

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Wire App.tsx

In `src/renderer/App.tsx`, pass `handleBookmarkSelect` as the reopen handler:
```tsx
<SplitLayout
  ...
  onReopenClosedTab={handleBookmarkSelect}
  ...
/>
```

`handleBookmarkSelect` accepts a `Bookmark` and adds it to openBookmarks +
creates a new column. This is exactly what "reopen" should do.

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Run tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- Existing tests should pass
- Add a test in `BookmarkTabs.test.tsx` that verifies reopen calls the callback:
  - Close a tab (to add to closedTabs), then trigger reopen, verify `onReopenClosedTab` is called with the correct bookmark
  - Verify the closed tab is removed from the closed stack after reopen

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] "Reopen Closed Tab" menu item works when closed tabs exist
- [ ] Reopened tab appears in the tab bar
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt

## Maintenance notes

- The `closedTabs` stack is in localStorage as full Bookmark objects. If bookmarks are updated externally, reopened tabs may show stale data. Plan 033 (rejected) addressed this — revisit if users report it.
- `handleBookmarkSelect` creates a new column for the reopened bookmark. If the user has 3 columns (max), the reopen will replace the active column's bookmark. This is acceptable behavior.

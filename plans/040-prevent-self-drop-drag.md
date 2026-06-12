# Plan 040: Prevent dropping tab onto its own column during drag

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 00e273e..HEAD -- src/renderer/components/split-view/SplitLayout.tsx src/renderer/components/bookmark-detail/BookmarkTabs.tsx`
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

When a user drags a tab and drops it on the edge of the same column it
already belongs to, `onSplitColumn` is called with the same column ID and
bookmark ID. This creates a new column with the same bookmark, resulting
in a duplicate. The drag operation should be a no-op when the source and
target are the same.

## Current state

- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — `handleDragStart` (lines 258-264) sets `text/tab-bookmark-id` and `text/tab-column-id` in dataTransfer
- `src/renderer/components/split-view/SplitLayout.tsx` — `handleDrop` (lines 58-70) reads `text/tab-bookmark-id` but ignores `text/tab-column-id`

BookmarkTabs drag start:
```tsx
const handleDragStart = useCallback((e: React.DragEvent, bookmarkId: string) => {
  if (!columnId) return;
  e.dataTransfer.setData('text/tab-bookmark-id', bookmarkId);
  e.dataTransfer.setData('text/tab-column-id', columnId);
  e.dataTransfer.effectAllowed = 'move';
  setDraggingId(bookmarkId);
}, [columnId]);
```

SplitLayout drop handler:
```tsx
const handleDrop = useCallback((e: React.DragEvent, edge: 'left' | 'right') => {
  e.preventDefault();
  setActiveDropZone(null);
  const bookmarkId = e.dataTransfer.getData('text/tab-bookmark-id');
  if (!bookmarkId || isMaxColumns) return;

  const targetColumn = edge === 'right'
    ? splitState.columns[splitState.columns.length - 1]
    : splitState.columns[0];
  if (targetColumn) {
    onSplitColumn(targetColumn.id, bookmarkId);
  }
}, [isMaxColumns, splitState.columns, onSplitColumn]);
```

The `text/tab-column-id` is already set but never read. We can use it to
detect self-drop.

## Commands you will need

| Purpose   | Command                    | Expected on success |
|-----------|----------------------------|---------------------|
| Typecheck | `pnpm typecheck`           | exit 0, no errors   |
| Tests     | `pnpm test`                | all pass            |
| Lint      | `pnpm lint`                | exit 0              |

## Scope

**In scope**:
- `src/renderer/components/split-view/SplitLayout.tsx` — add self-drop guard

**Out of scope**:
- `BookmarkTabs.tsx` — already sets the column ID correctly
- Store changes — none needed
- Visual drop target feedback — out of scope

## Git workflow

- Commit: `fix(ui): prevent dropping tab onto its own column`

## Steps

### Step 1: Add self-drop guard in SplitLayout

In `src/renderer/components/split-view/SplitLayout.tsx`, update `handleDrop`:

Before:
```tsx
const handleDrop = useCallback((e: React.DragEvent, edge: 'left' | 'right') => {
  e.preventDefault();
  setActiveDropZone(null);
  const bookmarkId = e.dataTransfer.getData('text/tab-bookmark-id');
  if (!bookmarkId || isMaxColumns) return;

  const targetColumn = edge === 'right'
    ? splitState.columns[splitState.columns.length - 1]
    : splitState.columns[0];
  if (targetColumn) {
    onSplitColumn(targetColumn.id, bookmarkId);
  }
}, [isMaxColumns, splitState.columns, onSplitColumn]);
```

After:
```tsx
const handleDrop = useCallback((e: React.DragEvent, edge: 'left' | 'right') => {
  e.preventDefault();
  setActiveDropZone(null);
  const bookmarkId = e.dataTransfer.getData('text/tab-bookmark-id');
  const sourceColumnId = e.dataTransfer.getData('text/tab-column-id');
  if (!bookmarkId || isMaxColumns) return;

  const targetColumn = edge === 'right'
    ? splitState.columns[splitState.columns.length - 1]
    : splitState.columns[0];

  // Prevent dropping onto the same column
  if (targetColumn && targetColumn.id === sourceColumnId) return;

  if (targetColumn) {
    onSplitColumn(targetColumn.id, bookmarkId);
  }
}, [isMaxColumns, splitState.columns, onSplitColumn]);
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Run tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- Existing tests should pass
- Add a test in `SplitLayout.test.tsx` that verifies self-drop is prevented:
  - Render SplitLayout with a column, simulate drag from that column to its own edge, verify `onSplitColumn` is NOT called

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] Dragging a tab and dropping on its own column edge does nothing
- [ ] Dragging a tab to a different column edge still works
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt

## Maintenance notes

- The `text/tab-column-id` was already being set by BookmarkTabs but never used — this plan finally uses it
- If drag-to-reorder within a column is added later, this guard must be revisited (self-drop would be valid for reorder)

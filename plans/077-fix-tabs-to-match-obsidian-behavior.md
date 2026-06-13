# Plan 077: Fix tabs to match Obsidian behavior

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 515d5f8..HEAD -- src/renderer/stores/bookmarkStore.ts src/renderer/stores/splitStore.ts src/renderer/components/split-view/SplitLayout.tsx src/renderer/components/split-view/SplitLayout.module.css src/renderer/App.tsx src/renderer/stores/__tests__/splitStore.test.ts src/renderer/components/bookmark-detail/__tests__/BookmarkTabs.test.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `515d5f8`, 2026-06-13
- **Issue**: — (not published via --issues)

## Why this matters

The current tab behavior diverges from Obsidian in three critical ways:

1. **Every bookmark click opens a new column** instead of a new tab in the active column. This means clicking 3 bookmarks in the sidebar opens 3 columns, not 3 tabs. Users expect Obsidian-like behavior: single-click = new tab in current pane.
2. **Splitting a bookmark removes it from the source column**. In Obsidian, "Open in New Column" duplicates the tab — the original stays. The current code removes it, which is disorienting.
3. **Split-view chrome shows even with 1 column** — column wrappers, dividers, and drop zones are unnecessary visual noise when there's only one pane. The content should render directly at full width.

Fixing these makes the tab/split UX match the Obsidian reference the product aims for (per `PRODUCT.md` line 35: "Obsidian as north star").

## Current state

### File 1: `src/renderer/stores/bookmarkStore.ts:49-112` — `handleBookmarkSelect`

```typescript
handleBookmarkSelect: (bookmark) => {
    const { splitState, openBookmarks } = useSplitStore.getState();
    const MAX_COLUMNS = 3;

    // Already open in the active column — no-op
    const activeCol = splitState.columns.find((c) => c.id === splitState.activeColumnId);
    if (activeCol?.activeTabId === bookmark.id) return;

    // If bookmark is already open in any column, switch to that column
    const existingCol = splitState.columns.find((c) => c.tabs.includes(bookmark.id));
    if (existingCol) {
      if (existingCol.id === splitState.activeColumnId) return; // already active
      useSplitStore.getState().setSplitState({
        ...splitState,
        activeColumnId: existingCol.id,
      });
      return;
    }

    let newSplit: typeof splitState;

    if (!activeCol) {
      // No columns yet — create first column
      const newCol = {
        id: `col-${Date.now()}`,
        tabs: [bookmark.id],
        activeTabId: bookmark.id,
        width: 1,
      };
      newSplit = { columns: [newCol], activeColumnId: newCol.id };
    } else if (splitState.columns.length < MAX_COLUMNS) {
      // Create new column for this bookmark        <--- BUG: creates new column instead of adding tab
      const newCol = {
        id: `col-${Date.now()}`,
        tabs: [bookmark.id],
        activeTabId: bookmark.id,
        width: 1,
      };
      newSplit = {
        columns: [...splitState.columns, newCol],
        activeColumnId: newCol.id,
      };
    } else {
      // Max columns reached — replace active column's bookmark
      newSplit = {
        ...splitState,
        columns: splitState.columns.map((c) =>
          c.id === activeCol.id
            ? { ...c, tabs: [bookmark.id], activeTabId: bookmark.id }
            : c,
        ),
        activeColumnId: activeCol.id,
      };
    }
    // ... rest of function
```

**Problem**: When a bookmark is not yet open and columns exist (< MAX_COLUMNS), it creates a NEW column instead of adding the bookmark as a tab in the active column. This is the root cause of the "opening multiple tabs = opening multiple columns" behavior.

### File 2: `src/renderer/stores/splitStore.ts:92-125` — `handleSplitColumn`

```typescript
handleSplitColumn: (columnId, bookmarkId) => {
    set((state) => {
      if (state.splitState.columns.length >= MAX_COLUMNS) return state;
      const sourceCol = state.splitState.columns.find((c) => c.id === columnId);
      if (!sourceCol) return state;

      // Remove bookmark from source column tabs       <--- BUG: removes tab from source
      const newSourceTabs = sourceCol.tabs.filter((id) => id !== bookmarkId);
      const newSourceActive = sourceCol.activeTabId === bookmarkId
        ? (newSourceTabs[0] ?? null)
        : sourceCol.activeTabId;

      const newCol: SplitColumn = {
        id: `col-${Date.now()}`,
        tabs: [bookmarkId],
        activeTabId: bookmarkId,
        width: 1,
      };

      const newCols = state.splitState.columns.map((c) =>
        c.id === columnId
          ? { ...c, tabs: newSourceTabs, activeTabId: newSourceActive }
          : c,
      );
      // ... inserts newCol after sourceCol
```

**Problem**: Removes the bookmark from the source column when splitting. In Obsidian, the original tab stays and the new column gets a copy. The source column keeps its tabs unchanged.

### File 3: `src/renderer/components/split-view/SplitLayout.tsx:83-99` — `handleDrop`

```typescript
const handleDrop = useCallback((e: React.DragEvent, edge: 'left' | 'right') => {
    // ...
    if (targetColumn) {
      onSplitColumn(targetColumn.id, bookmarkId);  // calls handleSplitColumn which removes from source
    }
  }, [isMaxColumns, splitState.columns, onSplitColumn]);
```

**Note**: The drop handler calls `handleSplitColumn` which has the remove-from-source bug. After fixing `handleSplitColumn`, drag-to-edge will also work correctly.

## Repo conventions

- State management: Zustand stores in `src/renderer/stores/`
- Split state persisted to localStorage via `saveSplitState()`
- Column IDs: `col-${Date.now()}`
- `computeOpenBookmarks(columns, bookmarks)` derives which bookmarks are open from column tab arrays
- Tests: vitest + @testing-library/react, test files in `__tests__/` co-located with source
- Commit convention: `<type>(<scope>): <description>`, scopes include `ui`, `main`

## Commands you will need

| Purpose   | Command                      | Expected on success |
|-----------|------------------------------|---------------------|
| Typecheck | `pnpm typecheck`             | exit 0, no errors   |
| Tests     | `pnpm test -- --run`         | all pass            |
| Lint      | `pnpm lint`                  | exit 0              |

## Scope

**In scope**:
- `src/renderer/stores/bookmarkStore.ts` — fix `handleBookmarkSelect`
- `src/renderer/stores/splitStore.ts` — fix `handleSplitColumn`
- `src/renderer/components/split-view/SplitLayout.tsx` — hide column chrome when 1 column
- `src/renderer/components/split-view/SplitLayout.module.css` — add single-column style
- `src/renderer/stores/__tests__/splitStore.test.ts` — update tests
- `src/renderer/components/bookmark-detail/__tests__/BookmarkTabs.test.tsx` — add integration tests

**Out of scope** (do NOT touch):
- `BookmarkTabs.tsx` — the tab component itself is correct
- `SplitDivider.tsx` — only renders when 2+ columns, no changes needed
- `App.tsx` — no changes needed

## Git workflow

- Branch: `advisor/077-fix-tabs-obsidian-behavior`
- Commit per logical unit with conventional commits
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Fix `handleBookmarkSelect` to add tab to active column instead of creating new column

In `src/renderer/stores/bookmarkStore.ts`, replace the `else if (splitState.columns.length < MAX_COLUMNS)` branch (lines 79-91) with logic that adds the bookmark as a tab in the active column:

```typescript
    } else {
      // Add bookmark as a new tab in the active column (Obsidian behavior)
      newSplit = {
        ...splitState,
        columns: splitState.columns.map((c) =>
          c.id === activeCol.id
            ? { ...c, tabs: [...c.tabs, bookmark.id], activeTabId: bookmark.id }
            : c,
        ),
        activeColumnId: activeCol.id,
      };
    }
```

This replaces both the "create new column" and "max columns reached" branches with a single "add tab to active column" behavior. Keep the early return for "already open in active column" and "already open in another column" (switch to it).

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Fix `handleSplitColumn` to keep tab in source column

In `src/renderer/stores/splitStore.ts`, modify `handleSplitColumn` (lines 92-125) to NOT remove the bookmark from the source column. Replace:

```typescript
      // Remove bookmark from source column tabs
      const newSourceTabs = sourceCol.tabs.filter((id) => id !== bookmarkId);
      const newSourceActive = sourceCol.activeTabId === bookmarkId
        ? (newSourceTabs[0] ?? null)
        : sourceCol.activeTabId;
```

With:

```typescript
      // Keep bookmark in source column (Obsidian behavior: split duplicates, doesn't move)
      const newSourceActive = sourceCol.activeTabId;
```

And change the column map to keep the source column unchanged:

```typescript
      const newCols = state.splitState.columns.map((c) =>
        c.id === columnId
          ? { ...c }  // source stays unchanged
          : c,
      );
```

The new column still gets `[bookmarkId]` as its tabs and `bookmarkId` as `activeTabId`. The source column keeps all its tabs including the split one.

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Hide split-view chrome when only 1 column exists

When there's a single column, the column wrapper div, drop zones, and flex sizing are unnecessary visual noise. The content should render directly — just BookmarkTabs + BookmarkDetail, full width, no column boundary.

In `src/renderer/components/split-view/SplitLayout.tsx`, modify the render logic:

**3a.** Add a derived variable after the existing `isMaxColumns` line:

```typescript
const isSingleColumn = splitState.columns.length === 1;
```

**3b.** Wrap the left drop zone in a condition — only render when 2+ columns or during drag:

```tsx
{/* Only show drop zones when 2+ columns (split view active) */}
{!isSingleColumn && (
  <div
    className={`${styles.dropZone} ${!isDragging ? styles.dropZoneCollapsed : ''} ${activeDropZone === 'left' ? styles.dropZoneActive : ''}`}
    data-drop-zone="left"
    aria-disabled={isMaxColumns}
    onDragOver={(e) => handleDragOver(e, 'left')}
    onDragLeave={handleDragLeave}
    onDrop={(e) => handleDrop(e, 'left')}
  />
)}
```

**3c.** In the column map, when `isSingleColumn`, render without the wrapper div and without `SplitDivider`:

```tsx
{splitState.columns.map((column, index) => {
  const bookmark = column.activeTabId
    ? openBookmarks.find(b => b.id === column.activeTabId) ?? null
    : null;

  const columnBookmarks = column.tabs
    .map((id) => openBookmarks.find((b) => b.id === id))
    .filter((b): b is Bookmark => b !== undefined);

  const isActive = column.id === splitState.activeColumnId;

  if (isSingleColumn) {
    // Single column: no wrapper, no divider — just tabs + detail, full width
    return (
      <div
        key={column.id}
        className={styles.singleColumn}
        onPointerEnter={() => onColumnActive(column.id)}
      >
        {column.tabs.length > 0 && (
          <BookmarkTabs
            openBookmarks={columnBookmarks}
            activeBookmarkId={column.activeTabId}
            onTabSelect={(id) => handleBookmarkSelect(column.id, id)}
            onTabClose={(id) => handleTabClose(column.id, id)}
            onTabCloseBatch={onTabCloseBatch ? (ids) => onTabCloseBatch(column.id, ids) : undefined}
            onReopenClosedTab={onReopenClosedTab}
            onSplitColumn={(id) => onSplitColumn(column.id, id)}
            columnId={column.id}
            dir={dir}
          />
        )}
        <BookmarkDetail
          bookmark={bookmark}
          onBookmarkChange={
            bookmark
              ? (updated: Partial<BookmarkDetailData>) =>
                  onBookmarkChange(bookmark.id, updated)
              : undefined
          }
        />
      </div>
    );
  }

  // Multi-column: existing layout with column wrapper + divider
  const flexBasis = `${(column.width / totalWidth) * 100}%`;
  return (
    <React.Fragment key={column.id}>
      {index > 0 && (
        <SplitDivider
          dir={dir}
          onResize={(delta) => {
            const prevCol = splitState.columns[index - 1];
            const currentCol = splitState.columns[index];
            const minFlex = MIN_COLUMN_WIDTH / (totalWidth * 10);
            const newPrevWidth = Math.max(minFlex, prevCol.width + delta / 100);
            const newCurrentWidth = Math.max(minFlex, currentCol.width - delta / 100);
            if (prevCol.id && currentCol.id) {
              if (onColumnResizeBatch) {
                onColumnResizeBatch([
                  { columnId: prevCol.id, width: newPrevWidth },
                  { columnId: currentCol.id, width: newCurrentWidth },
                ]);
              } else {
                onColumnResize(prevCol.id, newPrevWidth);
                onColumnResize(currentCol.id, newCurrentWidth);
              }
            }
          }}
        />
      )}
      <div
        className={`${styles.column} ${isActive ? styles.columnActive : ''}`}
        style={{ flex: `0 0 ${flexBasis}` }}
        onPointerEnter={() => onColumnActive(column.id)}
      >
        {column.tabs.length > 0 && (
          <BookmarkTabs
            openBookmarks={columnBookmarks}
            activeBookmarkId={column.activeTabId}
            onTabSelect={(id) => handleBookmarkSelect(column.id, id)}
            onTabClose={(id) => handleTabClose(column.id, id)}
            onTabCloseBatch={onTabCloseBatch ? (ids) => onTabCloseBatch(column.id, ids) : undefined}
            onReopenClosedTab={onReopenClosedTab}
            onSplitColumn={(id) => onSplitColumn(column.id, id)}
            columnId={column.id}
            dir={dir}
          />
        )}
        <BookmarkDetail
          bookmark={bookmark}
          onBookmarkChange={
            bookmark
              ? (updated: Partial<BookmarkDetailData>) =>
                  onBookmarkChange(bookmark.id, updated)
              : undefined
          }
        />
      </div>
    </React.Fragment>
  );
})}
```

**3d.** Wrap the right drop zone similarly:

```tsx
{!isSingleColumn && (
  <div
    className={`${styles.dropZone} ${!isDragging ? styles.dropZoneCollapsed : ''} ${activeDropZone === 'right' ? styles.dropZoneActive : ''}`}
    data-drop-zone="right"
    aria-disabled={isMaxColumns}
    onDragOver={(e) => handleDragOver(e, 'right')}
    onDragLeave={handleDragLeave}
    onDrop={(e) => handleDrop(e, 'right')}
  />
)}
```

**3e.** Add the `singleColumn` CSS class in `src/renderer/components/split-view/SplitLayout.module.css`:

```css
.singleColumn {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  min-width: 0;
  width: 100%;
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Update splitStore tests

In `src/renderer/stores/__tests__/splitStore.test.ts`, update the `handleSplitColumn` tests:

1. **"inserts new column after source column"** — Update assertion: after split, source column should still have the bookmark in its tabs. Add: `expect(splitState.columns[0].tabs).toContain('b2');`

2. **Add new test**: "does not remove bookmark from source column when splitting"

```typescript
    it('does not remove bookmark from source column when splitting', () => {
      useSplitStore.getState().setSplitState({
        columns: [{ id: 'col-1', tabs: ['b1', 'b2'], activeTabId: 'b1', width: 1 }],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().handleSplitColumn('col-1', 'b2');
      const { splitState } = useSplitStore.getState();
      expect(splitState.columns[0].tabs).toContain('b2');
      expect(splitState.columns[1].tabs).toContain('b2');
    });
```

3. **Add new test**: "split preserves source column activeTabId"

```typescript
    it('split preserves source column activeTabId', () => {
      useSplitStore.getState().setSplitState({
        columns: [{ id: 'col-1', tabs: ['b1'], activeTabId: 'b1', width: 1 }],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().handleSplitColumn('col-1', 'b1');
      const { splitState } = useSplitStore.getState();
      expect(splitState.columns[0].activeTabId).toBe('b1');
    });
```

4. **Update integration test** "split then merge returns to original column count" — after split, source column still has the bookmark, so merge needs to close the tab first. Adjust accordingly.

**Verify**: `pnpm test -- --run src/renderer/stores/__tests__/splitStore.test.ts` → all pass

### Step 5: Update bookmarkStore integration with handleBookmarkSelect changes

The `handleBookmarkSelect` change in Step 1 means selecting a bookmark now adds a tab to the active column instead of creating a column. The `computeOpenBookmarks` call still works correctly because it derives open bookmarks from column tabs.

Verify the `getActiveBookmark` function in bookmarkStore.ts still works — it reads `openBookmarks.find(b => b.id === activeCol.activeTabId)` which remains correct.

**Verify**: `pnpm test -- --run src/renderer/stores/__tests__/bookmarkStore.test.ts` → all pass

### Step 6: Run full test suite and lint

**Verify**:
- `pnpm lint` → exit 0
- `pnpm test -- --run` → all pass
- `pnpm typecheck` → exit 0

## Test plan

- Update `splitStore.test.ts` handleSplitColumn tests to verify source column retains its tabs
- Add new tests: split doesn't remove from source, split preserves activeTabId
- Existing BookmarkTabs tests should continue passing (component behavior unchanged)
- Existing bookmarkStore tests should continue passing (handleBookmarkSelect API unchanged, only internal behavior)

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test -- --run` exits 0; updated splitStore tests pass
- [ ] `pnpm lint` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated
- [ ] Selecting a bookmark from NavPanel opens it as a tab in the active column (not a new column)
- [ ] Splitting a bookmark keeps it in the source column
- [ ] The source column's activeTabId is unchanged after split
- [ ] With 1 column: no column wrapper, no dividers, no drop zones — just tabs + content at full width
- [ ] With 2+ columns: dividers and column wrappers appear, split view works as before

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.
- You discover the assumption "columns use tabs array for open bookmarks" is false.

## Maintenance notes

- Future changes: if a MAX_TABS_PER_COLUMN limit is added, `handleBookmarkSelect` will need a guard in the "add tab to active column" branch.
- The split behavior change (keep tab in source) affects drag-to-edge — after this fix, dragging a tab to an edge duplicates it into a new column. This is correct Obsidian behavior.
- `computeOpenBookmarks` derives open bookmarks from ALL column tabs, so both source and new column tabs are included automatically.

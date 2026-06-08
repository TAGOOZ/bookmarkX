# Split View — Technical Spec

**Feature:** Center panel splits into 2-3 vertical columns
**ADR:** 0021-split-view-multi-column.md
**Date:** 2026-06-08

---

## Architecture

### Current State

```
AppContent
  └─ <div style="flex:1; flex-direction:column">
       ├─ <BookmarkTabs />          ← single tab bar for all open bookmarks
       └─ <BookmarkDetail />        ← single instance, flex:1
```

Single `activeBookmarkId: string | null` controls which bookmark renders.

### Target State

```
AppContent
  └─ <SplitLayout columns splitState onSplit onMerge onActive>
       ├─ <div.splitColumn>         ← column 1
       │    ├─ <BookmarkTabs />     ← scoped to this column's bookmarks
       │    └─ <BookmarkDetail />   ← instance for column's active bookmark
       ├─ <SplitDivider />          ← resizable divider
       └─ <div.splitColumn>         ← column 2
            ├─ <BookmarkTabs />
            └─ <BookmarkDetail />
```

Each column is an independent BookmarkDetail instance with its own tabs, scroll, and editor state.

---

## Types

```typescript
// src/renderer/components/split-view/types.ts

interface SplitColumn {
  id: string;
  bookmarkId: string | null;
  width: number; // flex weight (1 = equal)
}

interface SplitState {
  columns: SplitColumn[];
  activeColumnId: string;
}

interface SplitLayoutProps {
  splitState: SplitState;
  openBookmarks: Bookmark[];
  onSplitColumn: (columnId: string, bookmarkId: string) => void;
  onMergeColumn: (columnId: string) => void;
  onColumnActive: (columnId: string) => void;
  onColumnResize: (columnId: string, width: number) => void;
  onBookmarkChange: (bookmarkId: string, updated: Partial<BookmarkDetailData>) => void;
  dir: 'ltr' | 'rtl';
}
```

---

## Files to Create

| File | Purpose | Est. Lines |
|------|---------|-----------|
| `src/renderer/components/split-view/types.ts` | Shared types | ~30 |
| `src/renderer/components/split-view/SplitLayout.tsx` | Container: columns + dividers | ~120 |
| `src/renderer/components/split-view/SplitLayout.module.css` | Layout styles | ~60 |
| `src/renderer/components/split-view/SplitDivider.tsx` | Draggable resize handle | ~80 |
| `src/renderer/components/split-view/SplitDivider.module.css` | Divider styles | ~30 |
| `src/renderer/components/split-view/index.ts` | Barrel export | ~5 |
| `src/renderer/components/split-view/__tests__/SplitLayout.test.tsx` | Tests | ~100 |

## Files to Modify

| File | Changes |
|------|---------|
| `src/renderer/App.tsx` | Replace single BookmarkTabs+BookmarkDetail with SplitLayout; manage SplitState |
| `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` | Add "Open in New Column" menu item + split icon on hover |
| `src/renderer/components/bookmark-detail/BookmarkTabs.module.css` | Styles for split button |

---

## Component Design

### SplitLayout

Renders a horizontal flex row of columns separated by dividers.

```
┌─────────────────────┬───┬─────────────────────┐
│   BookmarkTabs      │   │   BookmarkTabs      │
├─────────────────────┤ D │─────────────────────┤
│                     │ I │                     │
│   BookmarkDetail    │ V │   BookmarkDetail    │
│                     │   │                     │
└─────────────────────┴───┴─────────────────────┘
```

- Container: `display: flex; flex-direction: row; flex: 1; overflow: hidden`
- Each column: `flex: {width}; min-width: 300px; display: flex; flex-direction: column; overflow: hidden`
- Divider between columns: `<SplitDivider>` (4px wide, cursor: col-resize)
- RTL: container uses `direction: rtl` so columns mirror correctly

### SplitDivider

Thin vertical bar between columns. Drags to resize.

- Initial width: 4px
- Hover: 6px + background color change + `cursor: col-resize`
- Active drag: `user-select: none` on body, global pointermove/pointerup
- Constraint: each side must stay ≥ 300px
- Uses `pointer-events` for all resize logic (no mouse events)
- When there's only 1 column, no divider renders

### BookmarkTabs Extension

Two additions to existing BookmarkTabs:

1. **"Open in New Column" context menu item** — after the separator, before "Reopen Closed Tab". Calls `onSplitColumn(targetBookmarkId)`.
2. **Split icon on tab hover** — small icon (⧉) appears on the right side of each tab on hover. Clicking it calls `onSplitColumn(bookmarkId)`.

New prop: `onSplitColumn?: (bookmarkId: string) => void`

---

## State Management

### AppContent State Changes

```typescript
// BEFORE
const [activeBookmarkId, setActiveBookmarkId] = useState<string | null>(null);

// AFTER
const [splitState, setSplitState] = useState<SplitState>(() => {
  // Load from localStorage or default to single column
  const saved = loadSplitState();
  return saved ?? {
    columns: [{ id: 'col-1', bookmarkId: null, width: 1 }],
    activeColumnId: 'col-1',
  };
});
```

### Derived Values

```typescript
// Active bookmark for the focused column
const activeBookmark = useMemo(() => {
  const activeCol = splitState.columns.find(c => c.id === splitState.activeColumnId);
  if (!activeCol?.bookmarkId) return null;
  return openBookmarks.find(b => b.id === activeCol.bookmarkId) ?? null;
}, [splitState, openBookmarks]);

// Which column a bookmark is in
const columnForBookmark = useCallback((bookmarkId: string) => {
  return splitState.columns.find(c => c.bookmarkId === bookmarkId);
}, [splitState]);
```

### Operations

| Operation | Behavior |
|-----------|----------|
| `handleSplitColumn(columnId, bookmarkId)` | If columns < 3: split `columnId` into two. Place `bookmarkId` in the new column. Active column becomes the new one. |
| `handleMergeColumn(columnId)` | Remove column. If last column, set bookmarkId to null. Active column shifts to adjacent. |
| `handleColumnActive(columnId)` | Set `activeColumnId`. |
| `handleColumnResize(columnId, width)` | Update column's flex weight. Rebalance other columns proportionally. |
| `handleNavBookmarkSelect(bookmark)` | If bookmark already in a column: focus that column. Else: insert into active column (replace its bookmark if empty, else add to active column's bookmark). If active column already has a bookmark and columns < 3: create new column. |

### Persistence

Key: `bookmarkx-split-state` in localStorage

```json
{
  "columns": [
    { "id": "col-1", "bookmarkId": "abc123", "width": 1 },
    { "id": "col-2", "bookmarkId": "def456", "width": 1 }
  ],
  "activeColumnId": "col-1"
}
```

Save on every splitState change via useEffect.

---

## Context Menu Changes (BookmarkTabs)

New items in the right-click menu:

```
Close Tab
Close All Tabs
Close Tabs to Right
Close Tabs to Left
Close Other Tabs
─────────────────
Open in New Column      ← NEW
─────────────────
Reopen Closed Tab
```

The "Open in New Column" item:
- Disabled when columns already at 3
- Calls `onSplitColumn(targetBookmarkId)`
- Moves the bookmark from its current column to the new column

---

## Resize Logic

### Pointer Events Flow

1. `pointerdown` on divider → capture pointer, record initial positions
2. `pointermove` (global) → calculate delta, update flex weights
3. `pointerup` → release capture, save to state

### Constraints

- Minimum column width: 300px
- Maximum columns: 3
- When resizing, adjacent column gets inverse flex adjustment
- Total flex weight = sum of all column widths (normalized)

### RTL Consideration

In RTL mode, the divider drag direction is inverted. The SplitDivider receives `dir` prop and adjusts delta calculation accordingly.

---

## Acceptance Criteria

- [ ] Center panel renders 1-3 columns side by side
- [ ] Each column has its own BookmarkTabs bar and BookmarkDetail instance
- [ ] Resizable dividers between columns (300px min width per column)
- [ ] "Open in New Column" in BookmarkTabs context menu
- [ ] Split icon on tab hover
- [ ] Only active/focused column shows Contents sidebar (handled by BookmarkDetail instance scope)
- [ ] Maximum 3 columns enforced
- [ ] Close button per column (via BookmarkTabs close or dedicated column close)
- [ ] NavPanel selection opens bookmark in active column or creates new column
- [ ] Split state persisted in localStorage
- [ ] RTL layout mirrors correctly
- [ ] Tests pass: `pnpm lint && pnpm test`

---

## Implementation Order

1. Create `types.ts` and barrel `index.ts`
2. Implement `SplitDivider` (standalone, testable)
3. Implement `SplitLayout` (uses SplitDivider)
4. Update `BookmarkTabs` (add context menu item + split icon)
5. Refactor `App.tsx` (replace single panel with SplitLayout)
6. Add localStorage persistence
7. Write tests
8. Run lint + tests

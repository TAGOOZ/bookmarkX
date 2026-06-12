# Plan 044: Batch column resize into single state update

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 00e273e..HEAD -- src/renderer/components/split-view/SplitLayout.tsx src/renderer/stores/bookmarkStore.ts src/renderer/components/split-view/types.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `00e273e`, 2026-06-12

## Why this matters

The divider resize callback (SplitLayout.tsx:107-116) calls `onColumnResize`
twice per drag event — once for the previous column and once for the current
column. Each call triggers a separate Zustand `set`, causing 2 re-renders per
drag event. During rapid resizing, this causes visual jank and wasted work.

The fix: batch both width updates into a single `onColumnResizeBatch` call
that updates both columns in one state transition.

## Current state

- `src/renderer/components/split-view/SplitLayout.tsx` — divider onResize (lines 107-116)
- `src/renderer/stores/bookmarkStore.ts` — `handleColumnResize` (lines 262-273)
- `src/renderer/components/split-view/types.ts` — `SplitLayoutProps` (lines 15-25)

Current divider resize callback:
```tsx
onResize={(delta) => {
  const prevCol = splitState.columns[index - 1];
  const currentCol = splitState.columns[index];
  const minFlex = MIN_COLUMN_WIDTH / (totalWidth * 10);
  const newPrevWidth = Math.max(minFlex, prevCol.width + delta / 100);
  const newCurrentWidth = Math.max(minFlex, currentCol.width - delta / 100);
  if (prevCol.id && currentCol.id) {
    onColumnResize(prevCol.id, newPrevWidth);
    onColumnResize(currentCol.id, newCurrentWidth);
  }
}}
```

Current store action:
```tsx
handleColumnResize: (columnId, width) => {
  set((state) => {
    const newSplit: SplitState = {
      ...state.splitState,
      columns: state.splitState.columns.map((c) =>
        c.id === columnId ? { ...c, width } : c,
      ),
    };
    saveSplitState(newSplit);
    return { splitState: newSplit };
  });
},
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
- `src/renderer/stores/bookmarkStore.ts` — add `handleColumnResizeBatch` action
- `src/renderer/components/split-view/types.ts` — add prop
- `src/renderer/components/split-view/SplitLayout.tsx` — use batch action

**Out of scope**:
- BookmarkTabs.tsx — unchanged
- CSS changes — none

## Git workflow

- Commit: `perf(ui): batch column resize into single state update`

## Steps

### Step 1: Add handleColumnResizeBatch to store

In `bookmarkStore.ts`, add to the `BookmarkStore` interface:
```tsx
handleColumnResizeBatch: (updates: Array<{ columnId: string; width: number }>) => void;
```

Add implementation after `handleColumnResize`:
```tsx
handleColumnResizeBatch: (updates) => {
  set((state) => {
    const newSplit: SplitState = {
      ...state.splitState,
      columns: state.splitState.columns.map((c) => {
        const update = updates.find((u) => u.columnId === c.id);
        return update ? { ...c, width: update.width } : c;
      }),
    };
    saveSplitState(newSplit);
    return { splitState: newSplit };
  });
},
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Add to SplitLayoutProps

In `types.ts`, add:
```tsx
onColumnResizeBatch?: (updates: Array<{ columnId: string; width: number }>) => void;
```

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Wire SplitLayout to use batch action

In `SplitLayout.tsx`:

1. Add `onColumnResizeBatch` to destructured props
2. Update the divider onResize callback:

Before:
```tsx
onResize={(delta) => {
  const prevCol = splitState.columns[index - 1];
  const currentCol = splitState.columns[index];
  const minFlex = MIN_COLUMN_WIDTH / (totalWidth * 10);
  const newPrevWidth = Math.max(minFlex, prevCol.width + delta / 100);
  const newCurrentWidth = Math.max(minFlex, currentCol.width - delta / 100);
  if (prevCol.id && currentCol.id) {
    onColumnResize(prevCol.id, newPrevWidth);
    onColumnResize(currentCol.id, newCurrentWidth);
  }
}}
```

After:
```tsx
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
```

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Wire App.tsx

In `App.tsx`, add:
```tsx
const handleColumnResizeBatch = useBookmarkStore((s) => s.handleColumnResizeBatch);
```

Pass to SplitLayout:
```tsx
<SplitLayout
  ...
  onColumnResizeBatch={handleColumnResizeBatch}
  ...
/>
```

**Verify**: `pnpm typecheck` → exit 0

### Step 5: Run tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- Existing tests should pass
- Add test in `bookmarkStore.test.ts`: `handleColumnResizeBatch` updates multiple columns in one state change

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] Divider resize causes 1 state update instead of 2
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt

## Maintenance notes

- The old `handleColumnResize` is kept for backward compatibility (other callers
  may use it). The batch version is preferred for divider resize.
- If more columns are added to the resize logic, the batch approach scales
  naturally — just add more entries to the updates array.

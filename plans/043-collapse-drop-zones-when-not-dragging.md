# Plan 043: Fix drop zones to not waste space when not dragging

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 00e273e..HEAD -- src/renderer/components/split-view/SplitLayout.tsx src/renderer/components/split-view/SplitLayout.module.css src/renderer/components/split-view/__tests__/SplitLayout.test.tsx`
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

The left and right drop zones are always rendered at 50px wide each (100px
total). They're transparent when not active, but they still consume space
permanently. This wastes 100px of horizontal space that should be used for
columns. When there's only 1 column, the layout is:

```
[50px drop] [column] [50px drop]
```

The user sees 100px of wasted space on both sides. The fix: make the drop
zones collapse to 0px when not dragging, and expand to 50px only when a
drag is in progress.

## Current state

- `src/renderer/components/split-view/SplitLayout.tsx` — drop zones (lines 82-89, 149-156)
- `src/renderer/components/split-view/SplitLayout.module.css` — drop zone styles (lines 22-45)

Drop zone CSS:
```css
.dropZone {
  width: 50px;
  flex-shrink: 0;
  background: transparent;
  transition: background-color 0.15s ease;
  position: relative;
  z-index: 10;
}
```

SplitLayout rendering:
```tsx
<div
  className={`${styles.dropZone} ${activeDropZone === 'left' ? styles.dropZoneActive : ''}`}
  data-drop-zone="left"
  aria-disabled={isMaxColumns}
  onDragOver={(e) => handleDragOver(e, 'left')}
  onDragLeave={handleDragLeave}
  onDrop={(e) => handleDrop(e, 'left')}
/>
```

Convention: CSS uses CSS custom properties from the design system. Match
existing style.

## Commands you will need

| Purpose   | Command                    | Expected on success |
|-----------|----------------------------|---------------------|
| Typecheck | `pnpm typecheck`           | exit 0, no errors   |
| Tests     | `pnpm test`                | all pass            |
| Lint      | `pnpm lint`                | exit 0              |

## Scope

**In scope**:
- `src/renderer/components/split-view/SplitLayout.tsx` — track global drag state
- `src/renderer/components/split-view/SplitLayout.module.css` — collapse drop zones

**Out of scope**:
- Store changes — none
- BookmarkTabs.tsx — unchanged (it already sets dataTransfer correctly)
- SplitDivider.tsx — unchanged

## Git workflow

- Commit: `fix(ui): collapse drop zones when not dragging to save space`

## Steps

### Step 1: Track global drag state in SplitLayout

In `SplitLayout.tsx`, add state to track whether any tab is being dragged:

After the existing `activeDropZone` state (line 23):
```tsx
const [isDragging, setIsDragging] = useState(false);
```

Add a useEffect to listen for dragstart/dragend on the document:
```tsx
useEffect(() => {
  const handleDragStart = () => setIsDragging(true);
  const handleDragEnd = () => setIsDragging(false);
  document.addEventListener('dragstart', handleDragStart);
  document.addEventListener('dragend', handleDragEnd);
  return () => {
    document.removeEventListener('dragstart', handleDragStart);
    document.removeEventListener('dragend', handleDragEnd);
  };
}, []);
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Apply collapsed class to drop zones

Update the drop zone className to include a collapsed state:

Before:
```tsx
className={`${styles.dropZone} ${activeDropZone === 'left' ? styles.dropZoneActive : ''}`}
```

After:
```tsx
className={`${styles.dropZone} ${!isDragging ? styles.dropZoneCollapsed : ''} ${activeDropZone === 'left' ? styles.dropZoneActive : ''}`}
```

Do the same for the right drop zone.

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Add collapsed CSS

In `SplitLayout.module.css`, add:

```css
.dropZoneCollapsed {
  width: 0;
  min-width: 0;
  padding: 0;
  overflow: hidden;
}
```

Update the existing `.dropZone` to have a transition on width:
```css
.dropZone {
  width: 50px;
  flex-shrink: 0;
  background: transparent;
  transition: background-color 0.15s ease, width 0.15s ease;
  position: relative;
  z-index: 10;
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Run tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- Existing tests should pass
- The drop zone tests check for `data-drop-zone` attribute — they should still
  pass because the elements are still in the DOM, just collapsed

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] Drop zones are 0px wide when no drag is in progress
- [ ] Drop zones expand to 50px when a drag starts
- [ ] Drop zones collapse back when drag ends
- [ ] The full 100px is returned to columns when not dragging
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt

## Maintenance notes

- The dragstart/dragend listeners on `document` catch all drag events, not
  just tab drags. This is intentional — any drag should show the drop zones.
  If other drag sources are added later, consider filtering by data type.
- The CSS transition on width provides a smooth animation when expanding/collapsing

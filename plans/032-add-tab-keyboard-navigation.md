# Plan 032: Add keyboard navigation to tabs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a7e3553..HEAD -- src/renderer/components/bookmark-detail/BookmarkTabs.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `a7e3553`, 2026-06-12

## Why this matters

The tabs have no keyboard navigation. Users cannot use arrow keys to move
between tabs, Home/End to jump to first/last, or Enter/Space to select.
This makes the tab bar inaccessible for keyboard-only users and violates
WAI-ARIA Tabs pattern.

## Current state

- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — tab rendering (lines 223-266)

Each tab has `role="tab"` and `aria-selected`. The tab bar has `role="tablist"`.
There is no `onKeyDown` handler on the tab bar or individual tabs.

Convention: React event handlers, `useCallback` for stable references.

WAI-ARIA Tabs pattern: Left/Right arrow keys move between tabs, Home/End
go to first/last, Enter/Space select. RTL reverses arrow direction.

## Commands you will need

| Purpose   | Command                    | Expected on success |
|-----------|----------------------------|---------------------|
| Typecheck | `pnpm typecheck`           | exit 0, no errors   |
| Tests     | `pnpm test`                | all pass            |
| Lint      | `pnpm lint`                | exit 0              |

## Scope

**In scope**:
- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — add keyboard handler

**Out of scope**:
- CSS changes — none
- Store changes — none
- SplitLayout — unchanged

## Git workflow

- Commit: `feat(ui): add keyboard navigation to bookmark tabs`

## Steps

### Step 1: Add onKeyDown handler to tab bar

In `BookmarkTabs.tsx`, add a handler after the existing callbacks:

```tsx
const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
  const tabs = openBookmarks;
  if (tabs.length === 0) return;

  const currentIndex = tabs.findIndex((b) => b.id === activeBookmarkId);
  let nextIndex: number | null = null;

  // In RTL, reverse arrow direction
  const isRtl = dir === 'rtl';
  const prevKey = isRtl ? 'ArrowRight' : 'ArrowLeft';
  const nextKey = isRtl ? 'ArrowLeft' : 'ArrowRight';

  switch (e.key) {
    case prevKey:
      e.preventDefault();
      nextIndex = currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1;
      break;
    case nextKey:
      e.preventDefault();
      nextIndex = currentIndex >= tabs.length - 1 ? 0 : currentIndex + 1;
      break;
    case 'Home':
      e.preventDefault();
      nextIndex = 0;
      break;
    case 'End':
      e.preventDefault();
      nextIndex = tabs.length - 1;
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      if (activeBookmarkId) {
        onTabSelect(activeBookmarkId);
      }
      break;
    default:
      return;
  }

  if (nextIndex !== null && tabs[nextIndex]) {
    onTabSelect(tabs[nextIndex].id);
  }
}, [openBookmarks, activeBookmarkId, onTabSelect, dir]);
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Wire handler to tab bar

Add `onKeyDown={handleTabKeyDown}` to the tab bar div (line 217):

```tsx
<div
  ref={tabBarRef}
  className={`${styles.tabBar} ${dir === 'rtl' ? styles.rtl : ''}`}
  role="tablist"
  aria-label="Open bookmarks"
  dir={dir}
  onKeyDown={handleTabKeyDown}
>
```

Also add `tabIndex={0}` to make the tab bar focusable:
```tsx
<div
  ref={tabBarRef}
  className={`${styles.tabBar} ${dir === 'rtl' ? styles.rtl : ''}`}
  role="tablist"
  aria-label="Open bookmarks"
  dir={dir}
  tabIndex={0}
  onKeyDown={handleTabKeyDown}
>
```

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Run tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- Add tests in `BookmarkTabs.test.tsx`:
  - Arrow right moves to next tab
  - Arrow left moves to previous tab (wraps around)
  - Home moves to first tab
  - End moves to last tab
  - Enter selects the active tab
  - Arrow keys work in RTL (reversed)
- Pattern: use `fireEvent.keyDown` on the tabbar, then check `onTabSelect` calls

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] Tab bar has `tabIndex={0}` and `onKeyDown` handler
- [ ] Arrow keys, Home, End, Enter/Space all work
- [ ] RTL reverses arrow key direction
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt

## Maintenance notes

- If tabs gain a close button that should be keyboard-accessible, the tabIndex and focus management will need updating
- The WAI-ARIA Tabs pattern also recommends `aria-orientation="horizontal"` on the tablist — consider adding it

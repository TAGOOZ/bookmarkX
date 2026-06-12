# Plan 036: Fix focus management after tab close

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 00e273e..HEAD -- src/renderer/components/bookmark-detail/BookmarkTabs.tsx src/renderer/components/bookmark-detail/__tests__/BookmarkTabs.test.tsx`
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

When a user closes a tab via the close button or context menu, focus falls
to `<body>`. Keyboard users lose their position in the tab bar and must
tab through the entire page to get back. The expected behavior: after
closing a tab, focus moves to the next tab, or the previous tab, or the
tab bar itself if no tabs remain.

## Current state

- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — `closeAndTrack` (line 106-115) calls `onTabClose` but does no focus management. The close button click handler (line 314-317) calls `closeAndTrack` and nothing else.

Code in close button:
```tsx
<button
  className={styles.closeBtn}
  onClick={(e) => {
    e.stopPropagation();
    closeAndTrack(bookmark.id);
  }}
  aria-label={`Close ${displayTitle}`}
>
  ×
</button>
```

Code in `closeAndTrack`:
```tsx
const closeAndTrack = useCallback((bookmarkId: string) => {
  const bookmark = openBookmarks.find((b) => b.id === bookmarkId);
  if (bookmark) {
    setClosedTabs((prev) => {
      const next = [bookmark, ...prev.filter((t) => t.id !== bookmarkId)];
      return next.slice(0, MAX_CLOSED);
    });
  }
  onTabClose(bookmarkId);
}, [openBookmarks, onTabClose]);
```

Convention: `useRef` is used for DOM access (see `menuRef`, `tabBarRef`).

## Commands you will need

| Purpose   | Command                    | Expected on success |
|-----------|----------------------------|---------------------|
| Typecheck | `pnpm typecheck`           | exit 0, no errors   |
| Tests     | `pnpm test`                | all pass            |
| Lint      | `pnpm lint`                | exit 0              |

## Scope

**In scope**:
- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — add focus management after close

**Out of scope**:
- Store changes — none needed
- SplitLayout — unchanged
- Context menu close (handled separately in `handleMenuClose`)

## Git workflow

- Commit: `fix(ui): move focus to next tab after close`

## Steps

### Step 1: Add focus management helper

In `BookmarkTabs.tsx`, add a ref to track tab elements and a helper to move focus after close.

Add a new ref after the existing refs (around line 68):
```tsx
const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());
```

Add a helper function inside the component, after the refs:
```tsx
const focusTabAfterClose = useCallback((closedId: string) => {
  const idx = openBookmarks.findIndex((b) => b.id === closedId);
  // Next tab, or previous if closing the last one, or null if none remain
  const nextBookmark = openBookmarks[idx + 1] ?? openBookmarks[idx - 1];
  if (nextBookmark) {
    const el = tabRefs.current.get(nextBookmark.id);
    if (el) {
      el.focus();
      return;
    }
  }
  // No tabs left — focus the tab bar
  tabBarRef.current?.focus();
}, [openBookmarks]);
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Wire focus management into closeAndTrack

Update `closeAndTrack` to call `focusTabAfterClose` after closing:

Before:
```tsx
const closeAndTrack = useCallback((bookmarkId: string) => {
  const bookmark = openBookmarks.find((b) => b.id === bookmarkId);
  if (bookmark) {
    setClosedTabs((prev) => {
      const next = [bookmark, ...prev.filter((t) => t.id !== bookmarkId)];
      return next.slice(0, MAX_CLOSED);
    });
  }
  onTabClose(bookmarkId);
}, [openBookmarks, onTabClose]);
```

After:
```tsx
const closeAndTrack = useCallback((bookmarkId: string) => {
  const bookmark = openBookmarks.find((b) => b.id === bookmarkId);
  if (bookmark) {
    setClosedTabs((prev) => {
      const next = [bookmark, ...prev.filter((t) => t.id !== bookmarkId)];
      return next.slice(0, MAX_CLOSED);
    });
  }
  onTabClose(bookmarkId);
  // Focus management: move focus to adjacent tab
  requestAnimationFrame(() => {
    focusTabAfterClose(bookmarkId);
  });
}, [openBookmarks, onTabClose, focusTabAfterClose]);
```

Note: `requestAnimationFrame` is needed because `onTabClose` triggers a
state update that re-renders the tab list. We need to wait for the new
DOM before focusing.

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Add ref callback to tab elements

In the tab rendering loop (around line 299), add a ref callback to each tab div:

Before:
```tsx
<div
  key={bookmark.id}
  data-bookmark-id={bookmark.id}
  className={...}
  role="tab"
  ...
>
```

After:
```tsx
<div
  key={bookmark.id}
  ref={(el) => {
    if (el) tabRefs.current.set(bookmark.id, el);
    else tabRefs.current.delete(bookmark.id);
  }}
  data-bookmark-id={bookmark.id}
  className={...}
  role="tab"
  ...
>
```

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Add tabindex to make tabs focusable

Each tab needs `tabIndex={isActive ? 0 : -1}` for roving tabindex pattern:
```tsx
tabIndex={isActive ? 0 : -1}
```

This ensures only the active tab is in the tab order, and focus can be
programmatically moved to any tab.

**Verify**: `pnpm typecheck` → exit 0

### Step 5: Add tests

In `BookmarkTabs.test.tsx`, add tests for focus management:

```tsx
describe('focus management', () => {
  it('moves focus to next tab after closing current tab', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    const closeButtons = screen.getAllByRole('button', { name: /Close/ });
    await user.click(closeButtons[0]); // close first tab
    // Focus should move to the second tab (now index 0)
    const tabs = screen.getAllByRole('tab');
    expect(document.activeElement).toBe(tabs[0]);
  });

  it('moves focus to previous tab when closing last tab', async () => {
    const user = userEvent.setup();
    const twoBookmarks = bookmarks.slice(0, 2);
    renderWithIntl(
      <BookmarkTabs openBookmarks={twoBookmarks} activeBookmarkId="2" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    const closeButtons = screen.getAllByRole('button', { name: /Close/ });
    await user.click(closeButtons[1]); // close second (last) tab
    const tabs = screen.getAllByRole('tab');
    expect(document.activeElement).toBe(tabs[0]);
  });

  it('focuses tab bar when last tab is closed', async () => {
    const user = userEvent.setup();
    const singleBookmark = bookmarks.slice(0, 1);
    renderWithIntl(
      <BookmarkTabs openBookmarks={singleBookmark} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    const closeButtons = screen.getAllByRole('button', { name: /Close/ });
    await user.click(closeButtons[0]);
    const tabBar = screen.getByRole('tablist');
    expect(document.activeElement).toBe(tabBar);
  });
});
```

**Verify**: `pnpm test -- BookmarkTabs` → all pass

### Step 6: Run full suite and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- 3 new tests for focus management in `BookmarkTabs.test.tsx`
- Pattern: follow existing test style with `renderWithIntl` and `userEvent`

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0; 3 new focus management tests pass
- [ ] `pnpm lint` exits 0
- [ ] After closing a tab, focus moves to the next adjacent tab
- [ ] After closing the last tab, focus moves to the tab bar
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- `requestAnimationFrame` doesn't work in jsdom test environment (use `act` + `waitFor` instead)

## Maintenance notes

- If tabs ever support reorder, the focus logic must account for the new order
- The roving tabindex pattern (`tabIndex={isActive ? 0 : -1}`) is standard for tab widgets — see WAI-ARIA Tabs pattern

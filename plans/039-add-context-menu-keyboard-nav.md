# Plan 039: Add keyboard navigation to context menu

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 00e273e..HEAD -- src/renderer/components/bookmark-detail/BookmarkTabs.tsx src/renderer/components/bookmark-detail/BookmarkTabs.module.css src/renderer/components/bookmark-detail/__tests__/BookmarkTabs.test.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: a11y
- **Planned at**: commit `00e273e`, 2026-06-12

## Why this matters

The context menu renders as a `div` with `role="menu"` but has no keyboard
navigation. Keyboard users cannot:
- Arrow through menu items
- Press Enter/Space to activate an item
- Have focus trapped inside the menu while it's open

This is a WCAG 2.1 Level A failure (SC 2.1.1 Keyboard). The menu opens
on right-click (mouse only) and has no way to be opened or navigated via
keyboard.

## Current state

- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — context menu (lines 339-380)
- `src/renderer/components/bookmark-detail/BookmarkTabs.module.css` — menu styles (lines 111-157)

Context menu rendering:
```tsx
{contextMenu?.visible && (
  <div
    ref={menuRef}
    className={`${styles.contextMenu} ${dir === 'rtl' ? styles.rtl : ''}`}
    style={menuStyle}
    role="menu"
  >
    <button className={styles.menuItem} onClick={handleMenuClose} role="menuitem">
      {intl.formatMessage({ id: 'closeTab' })}
    </button>
    <button className={styles.menuItem} onClick={handleMenuCloseAll} role="menuitem">
      {intl.formatMessage({ id: 'closeAllTabs' })}
    </button>
    ...more items...
  </div>
)}
```

Convention: keyboard event handling follows the pattern in `handleTabKeyDown`
(lines 214-256). Match the style.

## Commands you will need

| Purpose   | Command                    | Expected on success |
|-----------|----------------------------|---------------------|
| Typecheck | `pnpm typecheck`           | exit 0, no errors   |
| Tests     | `pnpm test`                | all pass            |
| Lint      | `pnpm lint`                | exit 0              |

## Scope

**In scope**:
- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — add keyboard handler to context menu

**Out of scope**:
- CSS changes — styles are fine
- Store changes — none
- SplitLayout — unchanged

## Git workflow

- Commit: `feat(ui): add arrow key navigation to context menu`

## Steps

### Step 1: Add keyboard handler for context menu

In `BookmarkTabs.tsx`, add a `useCallback` for context menu keyboard events, after the existing handlers:

```tsx
const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
  const menu = menuRef.current;
  if (!menu) return;

  const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'));
  const currentIndex = items.indexOf(document.activeElement as HTMLElement);

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      if (currentIndex < items.length - 1) {
        items[currentIndex + 1].focus();
      } else {
        items[0].focus(); // wrap to first
      }
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (currentIndex > 0) {
        items[currentIndex - 1].focus();
      } else {
        items[items.length - 1].focus(); // wrap to last
      }
      break;
    case 'Home':
      e.preventDefault();
      items[0]?.focus();
      break;
    case 'End':
      e.preventDefault();
      items[items.length - 1]?.focus();
      break;
    case 'Escape':
      e.preventDefault();
      setContextMenu(null);
      break;
    default:
      break;
  }
}, []);
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Wire keyboard handler and auto-focus

In the context menu rendering, add `onKeyDown` and auto-focus:

Before:
```tsx
{contextMenu?.visible && (
  <div
    ref={menuRef}
    className={`${styles.contextMenu} ${dir === 'rtl' ? styles.rtl : ''}`}
    style={menuStyle}
    role="menu"
  >
```

After:
```tsx
{contextMenu?.visible && (
  <div
    ref={menuRef}
    className={`${styles.contextMenu} ${dir === 'rtl' ? styles.rtl : ''}`}
    style={menuStyle}
    role="menu"
    onKeyDown={handleMenuKeyDown}
  >
```

Add auto-focus on the first menu item when the menu opens. Use a useEffect:

```tsx
useEffect(() => {
  if (!contextMenu?.visible) return;
  // Focus the first menu item after render
  const timer = requestAnimationFrame(() => {
    const menu = menuRef.current;
    if (menu) {
      const firstItem = menu.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)');
      firstItem?.focus();
    }
  });
  return () => cancelAnimationFrame(timer);
}, [contextMenu?.visible]);
```

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Add tabindex to menu items for focusability

Each menu item button already has `role="menuitem"`. Buttons are natively
focusable, so no `tabIndex` change is needed. Just verify they can receive
focus.

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Add tests

In `BookmarkTabs.test.tsx`, add tests for context menu keyboard navigation:

```tsx
describe('context menu keyboard navigation', () => {
  it('focuses first menu item when menu opens', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    fireEvent.contextMenu(screen.getByText('Second Bookmark'));
    const menuItems = screen.getAllByRole('menuitem');
    expect(document.activeElement).toBe(menuItems[0]);
  });

  it('ArrowDown moves focus to next menu item', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    fireEvent.contextMenu(screen.getByText('Second Bookmark'));
    await user.keyboard('{ArrowDown}');
    const menuItems = screen.getAllByRole('menuitem');
    expect(document.activeElement).toBe(menuItems[1]);
  });

  it('ArrowUp wraps from first to last menu item', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    fireEvent.contextMenu(screen.getByText('Second Bookmark'));
    await user.keyboard('{ArrowUp}');
    const menuItems = screen.getAllByRole('menuitem');
    expect(document.activeElement).toBe(menuItems[menuItems.length - 1]);
  });

  it('Escape closes the context menu', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    fireEvent.contextMenu(screen.getByText('Second Bookmark'));
    expect(screen.getByRole('menu')).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Enter activates the focused menu item', async () => {
    const onTabClose = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={onTabClose} />
    );
    fireEvent.contextMenu(screen.getByText('Second Bookmark'));
    // First item is "Close" — pressing Enter should activate it
    await user.keyboard('{Enter}');
    expect(onTabClose).toHaveBeenCalledWith('2');
  });
});
```

**Verify**: `pnpm test -- BookmarkTabs` → all pass

### Step 5: Run full suite and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- 5 new tests for context menu keyboard navigation in `BookmarkTabs.test.tsx`
- Pattern: follow existing test style with `renderWithIntl`, `fireEvent.contextMenu`, and `userEvent`

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0; 5 new context menu keyboard tests pass
- [ ] `pnpm lint` exits 0
- [ ] Context menu items are navigable with ArrowUp/ArrowDown
- [ ] Focus wraps from first to last and vice versa
- [ ] Escape closes the menu
- [ ] Enter/Space activates the focused item
- [ ] First menu item receives focus when menu opens
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt

## Maintenance notes

- If menu items are added or reordered, the keyboard navigation works automatically (it queries `[role="menuitem"]` dynamically)
- The disabled "Reopen Closed Tab" button is skipped via `:not(:disabled)` selector
- This follows the WAI-ARIA Menu Button pattern

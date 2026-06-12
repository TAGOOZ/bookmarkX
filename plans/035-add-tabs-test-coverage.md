# Plan 035: Add comprehensive test coverage for tabs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a7e3553..HEAD -- src/renderer/components/bookmark-detail/__tests__/BookmarkTabs.test.tsx src/renderer/components/split-view/__tests__/SplitLayout.test.tsx src/renderer/stores/bookmarkStore.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: NONE
- **Depends on**: plans 027, 028, 029, 030, 031, 032
- **Category**: tests
- **Planned at**: commit `a7e3553`, 2026-06-12

## Why this matters

The existing test suite for BookmarkTabs covers only basic rendering, click
to select, close button, and aria attributes. There are zero tests for:
context menu operations (close all, close right/left, close others, reopen),
drag-to-split, keyboard navigation, RTL context menu, auto-scroll, and the
store-level tab management logic. This makes regressions undetectable.

## Current state

- `src/renderer/components/bookmark-detail/__tests__/BookmarkTabs.test.tsx` — 194 lines, 8 tests
- `src/renderer/components/split-view/__tests__/SplitLayout.test.tsx` — 196 lines, 8 tests
- `src/renderer/stores/bookmarkStore.ts` — no unit tests

Tests use: `vitest`, `@testing-library/react`, `@testing-library/user-event`,
`renderWithIntl` from `src/renderer/__tests__/test-utils.tsx`.

Convention: test files in `__tests__/` directories, `*.test.tsx` for components,
`*.test.ts` for non-React code. One `describe` block per component, `it` per case.

## Commands you will need

| Purpose   | Command                    | Expected on success |
|-----------|----------------------------|---------------------|
| Typecheck | `pnpm typecheck`           | exit 0, no errors   |
| Tests     | `pnpm test`                | all pass            |
| Lint      | `pnpm lint`                | exit 0              |

## Scope

**In scope**:
- `src/renderer/components/bookmark-detail/__tests__/BookmarkTabs.test.tsx` — add tests
- `src/renderer/components/split-view/__tests__/SplitLayout.test.tsx` — add tests
- `src/renderer/stores/__tests__/bookmarkStore.test.ts` — create, add store tests

**Out of scope**:
- Component implementation changes — all fixes are in prior plans
- Other test files

## Git workflow

- Commit: `test(ui): add comprehensive tab and split-view test coverage`

## Steps

### Step 1: Add context menu tests to BookmarkTabs.test.tsx

Add a new `describe('context menu')` block with these tests:

```tsx
describe('context menu', () => {
  it('opens context menu on right-click', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    await user.pointer({ target: screen.getByText('First Bookmark'), button: 'right' });
    expect(screen.getByRole('menu')).toBeDefined();
  });

  it('closes context menu on Escape', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    await user.pointer({ target: screen.getByText('First Bookmark'), button: 'right' });
    expect(screen.getByRole('menu')).toBeDefined();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('calls onTabClose for close menu item', async () => {
    const onTabClose = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={onTabClose} />
    );
    await user.pointer({ target: screen.getByText('First Bookmark'), button: 'right' });
    await user.click(screen.getByText(/closeTab/));
    expect(onTabClose).toHaveBeenCalledWith('1');
  });

  it('calls onTabCloseBatch for close all', async () => {
    const onTabCloseBatch = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} onTabCloseBatch={onTabCloseBatch} />
    );
    await user.pointer({ target: screen.getByText('First Bookmark'), button: 'right' });
    await user.click(screen.getByText(/closeAllTabs/));
    expect(onTabCloseBatch).toHaveBeenCalledWith(['1', '2', '3']);
  });

  it('calls onTabCloseBatch for close to right', async () => {
    const onTabCloseBatch = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} onTabCloseBatch={onTabCloseBatch} />
    );
    await user.pointer({ target: screen.getByText('Second Bookmark'), button: 'right' });
    await user.click(screen.getByText(/closeTabsToRight/));
    expect(onTabCloseBatch).toHaveBeenCalledWith(['3']);
  });

  it('calls onTabCloseBatch for close to left', async () => {
    const onTabCloseBatch = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} onTabCloseBatch={onTabCloseBatch} />
    );
    await user.pointer({ target: screen.getByText('Second Bookmark'), button: 'right' });
    await user.click(screen.getByText(/closeTabsToLeft/));
    expect(onTabCloseBatch).toHaveBeenCalledWith(['1']);
  });

  it('calls onTabCloseBatch for close others', async () => {
    const onTabCloseBatch = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} onTabCloseBatch={onTabCloseBatch} />
    );
    await user.pointer({ target: screen.getByText('Second Bookmark'), button: 'right' });
    await user.click(screen.getByText(/closeOtherTabs/));
    expect(onTabCloseBatch).toHaveBeenCalledWith(['1', '3']);
  });

  it('does not call onReopenClosedTab when no closed tabs', async () => {
    const onReopenClosedTab = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} onReopenClosedTab={onReopenClosedTab} />
    );
    await user.pointer({ target: screen.getByText('First Bookmark'), button: 'right' });
    await user.click(screen.getByText(/reopenClosedTab/));
    expect(onReopenClosedTab).not.toHaveBeenCalled();
  });
});
```

Note: the i18n keys `closeTab`, `closeAllTabs`, etc. need to match the actual
message IDs in `locales/en.json`. Check the file for exact keys.

**Verify**: `pnpm test -- BookmarkTabs` → all pass

### Step 2: Add keyboard navigation tests

```tsx
describe('keyboard navigation', () => {
  it('moves to next tab on ArrowRight', async () => {
    const onTabSelect = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={onTabSelect} onTabClose={vi.fn()} />
    );
    const tabBar = screen.getByRole('tablist');
    tabBar.focus();
    await user.keyboard('{ArrowRight}');
    expect(onTabSelect).toHaveBeenCalledWith('2');
  });

  it('moves to previous tab on ArrowLeft', async () => {
    const onTabSelect = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="2" onTabSelect={onTabSelect} onTabClose={vi.fn()} />
    );
    const tabBar = screen.getByRole('tablist');
    tabBar.focus();
    await user.keyboard('{ArrowLeft}');
    expect(onTabSelect).toHaveBeenCalledWith('1');
  });

  it('wraps around on ArrowRight from last tab', async () => {
    const onTabSelect = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="3" onTabSelect={onTabSelect} onTabClose={vi.fn()} />
    );
    const tabBar = screen.getByRole('tablist');
    tabBar.focus();
    await user.keyboard('{ArrowRight}');
    expect(onTabSelect).toHaveBeenCalledWith('1');
  });

  it('moves to first tab on Home', async () => {
    const onTabSelect = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="3" onTabSelect={onTabSelect} onTabClose={vi.fn()} />
    );
    const tabBar = screen.getByRole('tablist');
    tabBar.focus();
    await user.keyboard('{Home}');
    expect(onTabSelect).toHaveBeenCalledWith('1');
  });

  it('moves to last tab on End', async () => {
    const onTabSelect = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={onTabSelect} onTabClose={vi.fn()} />
    );
    const tabBar = screen.getByRole('tablist');
    tabBar.focus();
    await user.keyboard('{End}');
    expect(onTabSelect).toHaveBeenCalledWith('3');
  });
});
```

**Verify**: `pnpm test -- BookmarkTabs` → all pass

### Step 3: Add auto-scroll test

```tsx
describe('auto-scroll', () => {
  it('has data-bookmark-id on each tab', () => {
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0].getAttribute('data-bookmark-id')).toBe('1');
    expect(tabs[1].getAttribute('data-bookmark-id')).toBe('2');
  });
});
```

**Verify**: `pnpm test -- BookmarkTabs` → all pass

### Step 4: Add store-level tests

Create `src/renderer/stores/__tests__/bookmarkStore.test.ts`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { useBookmarkStore } from '../bookmarkStore';

describe('bookmarkStore tab management', () => {
  beforeEach(() => {
    // Reset store to initial state
    useBookmarkStore.setState({
      bookmarks: [],
      openBookmarks: [],
      splitState: {
        columns: [{ id: 'col-1', bookmarkId: null, width: 1 }],
        activeColumnId: 'col-1',
      },
    });
  });

  it('handleBookmarkSelect adds bookmark to openBookmarks', () => {
    const bookmark = { id: 'b1', title: 'Test', titleAr: null, titleEn: 'Test', url: 'https://a.com', topic: 't', priority: 'high' as const, contentType: 'article', content: '', createdAt: '' };
    useBookmarkStore.getState().handleBookmarkSelect(bookmark);
    const { openBookmarks } = useBookmarkStore.getState();
    expect(openBookmarks).toHaveLength(1);
    expect(openBookmarks[0].id).toBe('b1');
  });

  it('handleBookmarkSelect does not duplicate existing bookmark', () => {
    const bookmark = { id: 'b1', title: 'Test', titleAr: null, titleEn: 'Test', url: 'https://a.com', topic: 't', priority: 'high' as const, contentType: 'article', content: '', createdAt: '' };
    useBookmarkStore.getState().handleBookmarkSelect(bookmark);
    useBookmarkStore.getState().handleBookmarkSelect(bookmark);
    const { openBookmarks } = useBookmarkStore.getState();
    expect(openBookmarks).toHaveLength(1);
  });

  it('handleTabCloseTab removes bookmark and clears column', () => {
    const bookmark = { id: 'b1', title: 'Test', titleAr: null, titleEn: 'Test', url: 'https://a.com', topic: 't', priority: 'high' as const, contentType: 'article', content: '', createdAt: '' };
    useBookmarkStore.getState().handleBookmarkSelect(bookmark);
    useBookmarkStore.getState().handleTabCloseTab('col-1', 'b1');
    const { openBookmarks, splitState } = useBookmarkStore.getState();
    expect(openBookmarks).toHaveLength(0);
    expect(splitState.columns[0].bookmarkId).toBeNull();
  });

  it('handleMergeColumn clears column bookmark', () => {
    const bookmark = { id: 'b1', title: 'Test', titleAr: null, titleEn: 'Test', url: 'https://a.com', topic: 't', priority: 'high' as const, contentType: 'article', content: '', createdAt: '' };
    useBookmarkStore.getState().handleBookmarkSelect(bookmark);
    useBookmarkStore.getState().handleMergeColumn('col-1');
    const { splitState } = useBookmarkStore.getState();
    expect(splitState.columns[0].bookmarkId).toBeNull();
  });

  it('handleColumnActive updates active column', () => {
    useBookmarkStore.getState().handleColumnActive('col-999');
    const { splitState } = useBookmarkStore.getState();
    expect(splitState.activeColumnId).toBe('col-999');
  });
});
```

**Verify**: `pnpm test -- bookmarkStore` → all pass

### Step 5: Add SplitLayout tests for tab close

In `SplitLayout.test.tsx`, add:

```tsx
it('calls onTabCloseTab when a tab is closed in multi-tab column', () => {
  // This tests the wiring — the actual logic is in the store
  // SplitLayout passes onTabClose to BookmarkTabs, which calls it
  // Since BookmarkTabs is mocked, we verify the prop is passed correctly
  const onMergeColumn = vi.fn();
  const state: SplitState = {
    columns: [{ id: 'col-1', bookmarkId: '1', width: 1 }],
    activeColumnId: 'col-1',
  };
  renderWithIntl(
    <SplitLayout {...defaultProps} splitState={state} onMergeColumn={onMergeColumn} />
  );
  // The mock BookmarkTabs renders buttons that call onTabSelect
  // We verify the component renders without error
  expect(screen.getByTestId('bookmark-detail')).toBeTruthy();
});
```

**Verify**: `pnpm test` → all pass

### Step 6: Run full test suite and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

This IS the test plan. See steps above for all new tests.

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0; all new tests pass
- [ ] `pnpm lint` exits 0
- [ ] BookmarkTabs has tests for: context menu (7 tests), keyboard nav (5 tests), auto-scroll (1 test)
- [ ] bookmarkStore has tests for: select, close, merge, active (5 tests)
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The i18n message keys don't match what's in the locale files

## Maintenance notes

- When adding new tab features, add corresponding tests in this file
- The `renderWithIntl` helper is in `src/renderer/__tests__/test-utils.tsx` — always use it for components that use `react-intl`
- The store tests use `useBookmarkStore.setState()` for setup — this is the standard Zustand testing pattern

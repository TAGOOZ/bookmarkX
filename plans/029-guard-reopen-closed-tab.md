# Plan 029: Guard reopen closed tab against duplicates

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
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `a7e3553`, 2026-06-12

## Why this matters

The "Reopen Closed Tab" menu item blindly reopens the last closed tab without
checking if it's already open. If a user closes a tab then reopens it, then
closes it again and reopens, they get duplicate entries in `openBookmarks`.
This causes duplicate tabs to appear in the tab bar.

## Current state

- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — `handleMenuReopen` (lines 185-192)

Code:
```tsx
const handleMenuReopen = useCallback(() => {
  const last = closedTabs[0];
  if (last && onReopenClosedTab) {
    onReopenClosedTab(last);
    setClosedTabs((prev) => prev.slice(1));
  }
  setContextMenu(null);
}, [closedTabs, onReopenClosedTab]);
```

No check against `openBookmarks` before calling `onReopenClosedTab`.

Convention: `openBookmarks` is passed as a prop. It's available in the component.

## Commands you will need

| Purpose   | Command                    | Expected on success |
|-----------|----------------------------|---------------------|
| Typecheck | `pnpm typecheck`           | exit 0, no errors   |
| Tests     | `pnpm test`                | all pass            |
| Lint      | `pnpm lint`                | exit 0              |

## Scope

**In scope**:
- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — add guard in `handleMenuReopen`

**Out of scope**:
- Store changes — none needed
- SplitLayout — unchanged

## Git workflow

- Commit: `fix(ui): skip reopen if bookmark already open`

## Steps

### Step 1: Add guard in handleMenuReplace

In `BookmarkTabs.tsx`, update `handleMenuReopen`:

Before:
```tsx
const handleMenuReopen = useCallback(() => {
  const last = closedTabs[0];
  if (last && onReopenClosedTab) {
    onReopenClosedTab(last);
    setClosedTabs((prev) => prev.slice(1));
  }
  setContextMenu(null);
}, [closedTabs, onReopenClosedTab]);
```

After:
```tsx
const handleMenuReopen = useCallback(() => {
  const last = closedTabs[0];
  if (last && onReopenClosedTab) {
    // Skip if already open
    const alreadyOpen = openBookmarks.some((b) => b.id === last.id);
    if (!alreadyOpen) {
      onReopenClosedTab(last);
    }
    // Always remove from closed stack (even if already open — it was closed)
    setClosedTabs((prev) => prev.slice(1));
  }
  setContextMenu(null);
}, [closedTabs, onReopenClosedTab, openBookmarks]);
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Run tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- Add a test in `BookmarkTabs.test.tsx`: provide a bookmark in both `openBookmarks` and `closedTabs`, trigger reopen, verify `onReopenClosedTab` is NOT called
- Add a test: bookmark only in `closedTabs`, trigger reopen, verify `onReopenClosedTab` IS called
- Pattern: follow existing test style in `BookmarkTabs.test.tsx`

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] Reopen does not add duplicate when bookmark is already open
- [ ] Reopen still works when bookmark is not open
- [ ] Reopen always removes from closed stack
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt

## Maintenance notes

- The `closedTabs` stack is stored in localStorage as full Bookmark objects. If bookmarks are updated externally, reopened tabs may show stale data. A future improvement could store only IDs and resolve from the bookmarks list.

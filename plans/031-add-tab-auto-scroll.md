# Plan 031: Add auto-scroll active tab into view

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

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `a7e3553`, 2026-06-12

## Why this matters

When many tabs are open and the user selects a tab that's scrolled out of
view, the tab bar doesn't scroll to make it visible. The user has no
indication their tab was selected. This is a standard UX expectation in
browser-style tab bars.

## Current state

- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — tab rendering (lines 223-266)

The tab bar has `overflow-x: auto` (from CSS line 8). Tabs are rendered with
`flex-shrink: 0` (CSS line 39). There is no scroll-into-view logic.

Convention: React refs + `useEffect` for DOM measurements.

## Commands you will need

| Purpose   | Command                    | Expected on success |
|-----------|----------------------------|---------------------|
| Typecheck | `pnpm typecheck`           | exit 0, no errors   |
| Tests     | `pnpm test`                | all pass            |
| Lint      | `pnpm lint`                | exit 0              |

## Scope

**In scope**:
- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — add scroll-into-view on active tab change

**Out of scope**:
- CSS changes — none needed, `overflow-x: auto` already supports scrolling
- Store changes — none

## Git workflow

- Commit: `fix(ui): auto-scroll active tab into view`

## Steps

### Step 1: Add scroll-into-view effect

In `BookmarkTabs.tsx`:

1. Add a ref for the tab bar container:
```tsx
const tabBarRef = useRef<HTMLDivElement>(null);
```

2. Add a ref map for individual tabs (or use a callback ref). Simpler approach: use `useEffect` with `querySelector`:
```tsx
useEffect(() => {
  if (!activeBookmarkId || !tabBarRef.current) return;
  const activeTab = tabBarRef.current.querySelector(`[data-bookmark-id="${activeBookmarkId}"]`);
  if (activeTab) {
    activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }
}, [activeBookmarkId]);
```

3. Add `data-bookmark-id` attribute to each tab div (line 229):
```tsx
<div
  key={bookmark.id}
  data-bookmark-id={bookmark.id}
  className={...}
  role="tab"
  ...
```

4. Add `ref={tabBarRef}` to the tab bar div (line 217):
```tsx
<div
  ref={tabBarRef}
  className={`${styles.tabBar} ${dir === 'rtl' ? styles.rtl : ''}`}
  role="tablist"
  ...
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Run tests and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- Existing tests should pass
- Plan 031-b (test coverage plan) will add a test verifying the `data-bookmark-id` attribute exists

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `pnpm lint` exits 0
- [ ] Active tab has `data-bookmark-id` attribute
- [ ] Tab bar container has a ref
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt

## Maintenance notes

- `scrollIntoView` with `behavior: 'smooth'` can cause jank if the user rapidly switches tabs. If this becomes an issue, switch to `behavior: 'instant'` or debounce.

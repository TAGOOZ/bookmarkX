# Plan 041: Add aria-orientation and improve tab ARIA attributes

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

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: a11y
- **Planned at**: commit `00e273e`, 2026-06-12

## Why this matters

The tab bar has `role="tablist"` but is missing `aria-orientation="horizontal"`.
Screen readers need this to correctly announce the tab orientation. Additionally,
the close button aria-label is hardcoded in English instead of using i18n, which
breaks for Arabic users.

## Current state

- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — tab bar (lines 284-292), close button (lines 312-321)

Tab bar:
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

Close button:
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

Convention: i18n uses `intl.formatMessage({ id: 'key' })`.

## Commands you will need

| Purpose   | Command                    | Expected on success |
|-----------|----------------------------|---------------------|
| Typecheck | `pnpm typecheck`           | exit 0, no errors   |
| Tests     | `pnpm test`                | all pass            |
| Lint      | `pnpm lint`                | exit 0              |

## Scope

**In scope**:
- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — add `aria-orientation`, i18n for close button label

**Out of scope**:
- CSS changes — none
- Store changes — none
- SplitLayout — unchanged

## Git workflow

- Commit: `fix(ui): add aria-orientation and i18n for tab ARIA labels`

## Steps

### Step 1: Add aria-orientation to tab bar

In `BookmarkTabs.tsx`, add `aria-orientation="horizontal"` to the tab bar div:

```tsx
<div
  ref={tabBarRef}
  className={`${styles.tabBar} ${dir === 'rtl' ? styles.rtl : ''}`}
  role="tablist"
  aria-label="Open bookmarks"
  aria-orientation="horizontal"
  dir={dir}
  tabIndex={0}
  onKeyDown={handleTabKeyDown}
>
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Add i18n key for close button aria-label

Check `locales/en.json` and `locales/ar.json` for existing keys. If `closeBookmark`
doesn't exist, add it:

In `locales/en.json`:
```json
"closeBookmark": "Close {title}"
```

In `locales/ar.json`:
```json
"closeBookmark": "إغلاق {title}"
```

Then update the close button in BookmarkTabs.tsx:

Before:
```tsx
aria-label={`Close ${displayTitle}`}
```

After:
```tsx
aria-label={intl.formatMessage({ id: 'closeBookmark' }, { title: displayTitle })}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Add i18n key for split button aria-label

Similarly, update the split button:

Before:
```tsx
aria-label={`Open ${displayTitle} in new column`}
```

After — check if `openInNewColumnWithTitle` exists or add:
In `locales/en.json`:
```json
"openInNewColumnWithTitle": "Open {title} in new column"
```

In `locales/ar.json`:
```json
"openInNewColumnWithTitle": "فتح {title} في عمود جديد"
```

```tsx
aria-label={intl.formatMessage({ id: 'openInNewColumnWithTitle' }, { title: displayTitle })}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Add tests

In `BookmarkTabs.test.tsx`, add:

```tsx
it('tab bar has aria-orientation horizontal', () => {
  renderWithIntl(
    <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
  );
  const tabBar = screen.getByRole('tablist');
  expect(tabBar.getAttribute('aria-orientation')).toBe('horizontal');
});
```

**Verify**: `pnpm test -- BookmarkTabs` → all pass

### Step 5: Run full suite and lint

**Verify**: `pnpm test` → all pass
**Verify**: `pnpm lint` → exit 0

## Test plan

- 1 new test for `aria-orientation` in `BookmarkTabs.test.tsx`
- Existing tests should continue to pass

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0; 1 new ARIA test passes
- [ ] `pnpm lint` exits 0
- [ ] Tab bar has `aria-orientation="horizontal"`
- [ ] Close button aria-label is i18n-aware
- [ ] Split button aria-label is i18n-aware
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The i18n keys don't exist in locale files

## Maintenance notes

- If the tab bar ever becomes vertical (e.g., stacked tabs on small screens), change `aria-orientation` to `"vertical"`
- The i18n keys follow the existing pattern in the locale files

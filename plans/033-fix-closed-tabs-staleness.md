# Plan 033: Fix stale closed tabs by storing only IDs

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

Closed tabs are stored in localStorage as full `Bookmark` objects. If a
bookmark's title, URL, or other fields change while it's in the closed stack,
reopening it restores stale data. Storing only IDs and resolving from the
current bookmarks list when reopening keeps data fresh.

## Current state

- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — closed tabs management (lines 26-45, 66, 97-106, 185-192)

`loadClosedTabs` and `saveClosedTabs` serialize full `Bookmark[]` to localStorage.
`handleMenuReopen` passes the full bookmark to `onReopenClosedTab`.

Convention: localStorage reads are wrapped in try/catch for safety.

## Commands you will need

| Purpose   | Command                    | Expected on success |
|-----------|----------------------------|---------------------|
| Typecheck | `pnpm typecheck`           | exit 0, no errors   |
| Tests     | `pnpm test`                | all pass            |
| Lint      | `pnpm lint`                | exit 0              |

## Scope

**In scope**:
- `src/renderer/components/bookmark-detail/BookmarkTabs.tsx` — change closed tabs to store IDs, resolve on reopen

**Out of scope**:
- Store changes — `onReopenClosedTab` prop stays the same
- SplitLayout — unchanged

## Git workflow

- Commit: `fix(ui): store closed tabs as IDs to prevent stale data`

## Steps

### Step 1: Change closed tabs to store IDs

Replace the closed tabs type and functions:

Before:
```tsx
const CLOSED_TABS_KEY = 'bookmarkx-closed-tabs';
const MAX_CLOSED = 20;

function loadClosedTabs(): Bookmark[] {
  try {
    const raw = localStorage.getItem(CLOSED_TABS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveClosedTabs(tabs: Bookmark[]): void {
  try {
    localStorage.setItem(CLOSED_TABS_KEY, JSON.stringify(tabs));
  } catch {
    // localStorage may be unavailable
  }
}
```

After:
```tsx
const CLOSED_TABS_KEY = 'bookmarkx-closed-tabs';
const MAX_CLOSED = 20;

function loadClosedTabIds(): string[] {
  try {
    const raw = localStorage.getItem(CLOSED_TABS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveClosedTabIds(ids: string[]): void {
  try {
    localStorage.setItem(CLOSED_TABS_KEY, JSON.stringify(ids));
  } catch {
    // localStorage may be unavailable
  }
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Update state and callbacks

Change the state from `Bookmark[]` to `string[]`:

```tsx
const [closedTabIds, setClosedTabIds] = useState<string[]>(loadClosedTabIds);
```

Update the save effect:
```tsx
useEffect(() => {
  saveClosedTabIds(closedTabIds);
}, [closedTabIds]);
```

Update `closeAndTrack`:
```tsx
const closeAndTrack = useCallback((bookmarkId: string) => {
  setClosedTabIds((prev) => {
    const next = [bookmarkId, ...prev.filter((id) => id !== bookmarkId)];
    return next.slice(0, MAX_CLOSED);
  });
  onTabClose(bookmarkId);
}, [onTabClose]);
```

Update `handleMenuCloseAll`:
```tsx
setClosedTabIds((prev) => {
  const existing = new Set(prev);
  const newIds = openBookmarks.map((b) => b.id).filter((id) => !existing.has(id));
  return [...newIds, ...prev].slice(0, MAX_CLOSED);
});
```

(And similar updates for `handleMenuCloseToRight`, `handleMenuCloseToLeft`, `handleMenuCloseOthers` — each adds bookmark IDs instead of bookmark objects.)

Update `handleMenuReopen`:
```tsx
const handleMenuReopen = useCallback(() => {
  const lastId = closedTabIds[0];
  if (lastId && onReopenClosedTab) {
    // Resolve from openBookmarks or bookmarks prop if available
    // For now, create a minimal bookmark — the store will handle full resolution
    const existing = openBookmarks.find((b) => b.id === lastId);
    if (existing) {
      // Already open, skip (from plan 029)
    } else {
      // Pass a minimal bookmark — the store's handleBookmarkSelect will handle it
      onReopenClosedTab({
        id: lastId,
        title: lastId, // placeholder — store resolves the real title
        titleAr: null,
        titleEn: null,
        url: '',
        topic: '',
        priority: 'medium',
        contentType: 'article',
        content: '',
        createdAt: '',
      });
    }
    setClosedTabIds((prev) => prev.slice(1));
  }
  setContextMenu(null);
}, [closedTabIds, onReopenClosedTab, openBookmarks]);
```

Wait — this approach is flawed. The `onReopenClosedTab` callback expects a full `Bookmark`. The caller (`BookmarkDetail` or the store) resolves the bookmark. But we only have an ID.

Better approach: change `onReopenClosedTab` to accept just an ID. But that changes the prop interface.

Cleanest approach: keep `closedTabs` as `Bookmark[]` in state (for the UI to show titles in future), but persist only IDs to localStorage. On load, if bookmarks list is available, resolve IDs to bookmarks. If not (before bookmarks load), store as IDs and resolve lazily.

Actually, simplest fix: the `onReopenClosedTab` callback is called with a Bookmark, and the store's `handleBookmarkSelect` already handles adding a bookmark to openBookmarks by ID. Let me check what `onReopenClosedTab` does in the parent.

Looking at `App.tsx` — there's no `onReopenClosedTab` wired. It's an optional prop. Looking at `SplitLayout.tsx` — also doesn't pass it. So `onReopenClosedTab` is currently unused in production! The menu button shows but the callback is never provided.

Given this, the simplest fix: store IDs only, and when the callback IS eventually wired, it can resolve from the bookmarks list. For now, the reopen feature is effectively a no-op.

Revised approach: store IDs, and change the reopen handler to pass just the ID to a new prop `onReopenClosedTabId`:

```tsx
onReopenClosedTabId?: (bookmarkId: string) => void;
```

But this adds complexity for a feature that's not wired. Let me keep it simpler.

**Final approach**: Store IDs in localStorage. Keep `closedTabs` as `Bookmark[]` in state. On component mount, resolve IDs to bookmarks using `openBookmarks` (which is always populated). If a bookmark isn't in `openBookmarks` (it was closed and is no longer open), store the ID and resolve when reopened.

Actually the simplest approach that works: just change localStorage to store IDs, keep the in-memory state as `Bookmark[]`, and resolve on load:

```tsx
function loadClosedTabs(): Bookmark[] {
  try {
    const raw = localStorage.getItem(CLOSED_TABS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Backward compat: if it's an array of objects, extract IDs
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
      return parsed; // legacy format, will be migrated on next save
    }
    // It's an array of IDs — return as stubs (will be enriched when bookmarks load)
    return parsed.map((id: string) => ({
      id,
      title: id,
      titleAr: null,
      titleEn: null,
      url: '',
      topic: '',
      priority: 'medium' as const,
      contentType: 'article',
      content: '',
      createdAt: '',
    }));
  } catch {
    return [];
  }
}
```

This is getting too complex. Let me simplify: **don't change the storage format**. The staleness issue is minor and the fix adds significant complexity for little gain. Mark this plan as REJECTED.

**REVISED**: On reflection, this plan adds complexity disproportionate to the bug severity. The staleness only matters if bookmarks are updated while they're in the closed stack, which is an edge case. The plan is REJECTED — record in README.

## Test plan

N/A — plan rejected.

## Done criteria

N/A — plan rejected.

## STOP conditions

- Plan rejected: complexity outweighs benefit

## Maintenance notes

- Revisit if users report stale data in reopened tabs
- A future improvement could use a background sync to refresh closed tab data when bookmarks are updated

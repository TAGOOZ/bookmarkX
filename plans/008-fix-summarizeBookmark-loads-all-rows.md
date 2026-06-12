# Plan 008: Fix summarizeBookmark loading entire bookmarks table

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec88c1..HEAD -- src/main/ipc/content.ts src/db/bookmarks.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `2ec88c1`, 2026-06-12

## Why this matters

Summarizing a single bookmark calls `getStoredBookmarks(db)` which does `SELECT * FROM bookmarks ORDER BY created_at DESC` (no LIMIT), then `.find()` to locate one row. This is O(N) for what should be O(1).

## Current state

- `src/main/ipc/content.ts` — IPC handlers for summarize/extract/chat (229 lines)
- `src/db/bookmarks.ts` — bookmark CRUD

**The buggy code (content.ts:29-30)**:
```typescript
const bookmarks = await getStoredBookmarks(db);
const bookmark = bookmarks.find((b) => b.id === bookmarkId);
```

`getStoredBookmarks` does `SELECT * FROM bookmarks ORDER BY created_at DESC` with no LIMIT.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/main/ipc/content.ts`
- `src/db/bookmarks.ts` (add a new function)

**Out of scope**:
- Other IPC handlers
- The renderer

## Steps

### Step 1: Add getBookmarkById to db/bookmarks.ts

Add a new exported function:

```typescript
export async function getBookmarkById(
  db: Client,
  id: string
): Promise<BookmarkData | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM bookmarks WHERE id = ?',
    args: [id],
  });
  return (rows[0] as BookmarkData) || null;
}
```

Place it after the existing `getStoredBookmarks` function.

**Verify**: `grep -n "getBookmarkById" src/db/bookmarks.ts` → 2 matches (function definition + export)

### Step 2: Update content.ts to use getBookmarkById

Change the `summarize-bookmark` handler (lines 25-34) from:

```typescript
const { getStoredBookmarks } = await import('../../db/bookmarks');
const bookmarks = await getStoredBookmarks(db);
const bookmark = bookmarks.find((b) => b.id === bookmarkId);
```

to:

```typescript
const { getBookmarkById } = await import('../../db/bookmarks');
const bookmark = await getBookmarkById(db, bookmarkId);
```

**Verify**: `grep -n "getStoredBookmarks" src/main/ipc/content.ts` → no matches

### Step 3: Run full verification

**Verify**: `pnpm lint && pnpm test` → exit 0, all tests pass

## Test plan

- Existing tests should continue to pass
- The summarize handler now does O(1) lookup instead of O(N)

## Done criteria

- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `getBookmarkById` exists in `db/bookmarks.ts`
- [ ] `content.ts` uses `getBookmarkById` instead of `getStoredBookmarks` + `.find()`
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt

# Plan 052: Extract duplicate Bookmark row-to-object mapping

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0edf695..HEAD -- src/db/bookmarks.ts src/pipeline/classify-and-notify.ts src/pipeline/batch-import.ts src/renderer/stores/bookmarkStore.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Category**: clean-code
- **Planned at**: commit `0edf695`, 2026-06-12

## Why this matters

The same 11-field bookmark row-to-object mapping is copy-pasted in 5+ places across the codebase. When a new field is added to the Bookmark type, every copy must be updated manually. Missing one creates a silent bug where the field is undefined in some code paths. Extracting a single `rowToBookmark` helper eliminates this class of bug.

## Current state

- `src/db/bookmarks.ts` — bookmark CRUD functions
- `src/pipeline/classify-and-notify.ts` — classification pipeline
- `src/pipeline/batch-import.ts` — batch import logic
- `src/renderer/stores/bookmarkStore.ts` — renderer bookmark store

**The repeated mapping (appears 5+ times)**:
```typescript
{
  id: row.id,
  url: row.url,
  title: row.title,
  title_ar: row.title_ar,
  title_en: row.title_en,
  author_name: row.author_name,
  author_handle: row.author_handle,
  content_type: row.content_type,
  fetched_at: row.fetched_at,
  tweet_text: row.tweet_text,
  created_at: row.created_at,
}
```

**Locations**:
- `src/db/bookmarks.ts:30-42` (getStoredBookmarks)
- `src/db/bookmarks.ts:78-90` (getUnfetchedBookmarks)
- `src/pipeline/classify-and-notify.ts:20-32` (getUnclassifiedBookmarks)
- `src/pipeline/batch-import.ts:149-161` (inline in classify loop)
- `src/renderer/stores/bookmarkStore.ts:365-387` (fetchBookmarks mapping)

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/db/bookmarks.ts`
- `src/pipeline/classify-and-notify.ts`
- `src/pipeline/batch-import.ts`
- `src/renderer/stores/bookmarkStore.ts`

**Out of scope**:
- Other files that might have similar mappings

## Steps

### Step 1: Add rowToBookmark helper to src/db/bookmarks.ts

Add a helper function at the top of the file (after imports):

```typescript
function rowToBookmark(row: any): Bookmark {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    title_ar: row.title_ar,
    title_en: row.title_en,
    author_name: row.author_name,
    author_handle: row.author_handle,
    content_type: row.content_type,
    fetched_at: row.fetched_at,
    tweet_text: row.tweet_text,
    created_at: row.created_at,
  };
}
```

Export it so pipeline files can use it:
```typescript
export function rowToBookmark(row: any): Bookmark {
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Update getStoredBookmarks to use rowToBookmark

Replace the inline mapping in `getStoredBookmarks` (lines 30-42) with:
```typescript
const bookmarks = rows.map(rowToBookmark);
```

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Update getUnfetchedBookmarks to use rowToBookmark

Replace the inline mapping in `getUnfetchedBookmarks` (lines 78-90) with:
```typescript
return rows.map(rowToBookmark);
```

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Update classify-and-notify.ts to use rowToBookmark

Replace the inline mapping in `getUnclassifiedBookmarks` (lines 20-32) with:
```typescript
import { rowToBookmark } from '../db/bookmarks';
// ...
const bookmarks = rows.map(rowToBookmark);
```

**Verify**: `pnpm typecheck` → exit 0

### Step 5: Update batch-import.ts to use getBookmarkById

The inline mapping in `batch-import.ts` (lines 149-161) should use `getBookmarkById` from the db module instead of re-mapping. Import and call `getBookmarkById` from `src/db/bookmarks.ts`.

**Verify**: `pnpm typecheck` → exit 0

### Step 6: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → exit 0, all pass

## Test plan

- Existing tests should continue to pass
- No new tests needed — this is a pure refactor with no behavior change

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -rn "id: row.id, url: row.url" src/db/bookmarks.ts` returns exactly 1 match (the helper)
- [ ] `batch-import.ts` uses `getBookmarkById` instead of inline mapping
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The fix requires changing the Bookmark type definition

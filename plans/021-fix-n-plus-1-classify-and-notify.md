# Plan 021: Fix N+1 queries in classifyAndNotify

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9eea449..HEAD -- src/pipeline/classify-and-notify.ts src/db/classifications.ts src/db/bookmarks.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `9eea449`, 2026-06-12
- **Issue**: — (not published via --issues)

## Why this matters

`classifyAndNotify` at `src/pipeline/classify-and-notify.ts:27` calls `getStoredBookmarks(db)` which runs `SELECT * FROM bookmarks` — loading every bookmark into memory. Then for each bookmark (line 33), it calls `getClassification(db, bookmark.id)` which itself issues 3 queries (classifications, topics, hashtags). With 1000 bookmarks this is 1 + 3000 queries. The function already has a pattern for querying unclassified bookmarks in `batch-import.ts:121-127` using a LEFT JOIN — this plan reuses that pattern.

## Current state

- `src/pipeline/classify-and-notify.ts:27` — `getStoredBookmarks(db)` fetches ALL bookmarks
- `src/pipeline/classify-and-notify.ts:33` — `getClassification(db, bookmark.id)` per bookmark = 3 queries each
- `src/db/classifications.ts:36-73` — `getClassification` issues 3 separate queries: classifications, topics (via bookmarks.topic_id), hashtags (via junction table)
- `src/pipeline/batch-import.ts:121-127` — existing unclassified-bookmarks query pattern (LEFT JOIN approach)
- `src/db/bookmarks.ts` — `getStoredBookmarks` is `SELECT * FROM bookmarks ORDER BY created_at DESC`

Repo conventions: service-layer abstraction with typed I/O (ADR-0013). Error handling: try/catch with `console.error` on non-critical paths. Tests use `createTestDb()` from `src/db/__tests__/test-client.ts`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Tests     | `pnpm test -- classify`  | all pass            |
| Lint      | `pnpm lint`              | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/pipeline/classify-and-notify.ts` — replace `getStoredBookmarks` + per-bookmark `getClassification` with a single efficient query
- `src/pipeline/__tests__/classify-and-notify.test.ts` — update tests if needed

**Out of scope**:
- `src/db/classifications.ts` — `getClassification` is used elsewhere; don't change its signature
- `src/db/bookmarks.ts` — `getStoredBookmarks` is used elsewhere; don't change it
- `src/pipeline/batch-import.ts` — already has its own optimized query

## Git workflow

- Branch: `advisor/021-fix-n-plus-1-classify`
- Commit: `perf(classify): replace N+1 classifyAndNotify with single JOIN query`

## Steps

### Step 1: Create getUnclassifiedBookmarks helper

In `src/pipeline/classify-and-notify.ts`, add a new function that fetches only bookmarks without a classification, using a LEFT JOIN:

```typescript
async function getUnclassifiedBookmarks(db: Client): Promise<Bookmark[]> {
  const { rows } = await db.execute({
    sql: `SELECT b.* FROM bookmarks b
          LEFT JOIN classifications c ON c.bookmark_id = b.id
          WHERE c.id IS NULL
          ORDER BY b.created_at DESC`,
    args: [],
  });
  return rows.map((row: any) => ({
    id: row.id,
    tweet_id: row.tweet_id,
    url: row.url,
    content_type: row.content_type,
    title: row.title,
    title_ar: row.title_ar,
    title_en: row.title_en,
    author_name: row.author_name,
    author_handle: row.author_handle,
    tweet_text: row.tweet_text,
    fetched_at: row.fetched_at,
    created_at: row.created_at,
  }));
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Replace getStoredBookmarks with getUnclassifiedBookmarks

In `classifyAndNotify`, change line 27 from:
```typescript
const bookmarks = await getStoredBookmarks(db);
```
to:
```typescript
const bookmarks = await getUnclassifiedBookmarks(db);
```

Remove the `import { getStoredBookmarks }` line and add `import { Bookmark } from '../fetch/types'` if needed.

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Remove the per-bookmark getClassification check

Since `getUnclassifiedBookmarks` already filters out classified bookmarks, remove lines 33-34:
```typescript
const existing = await getClassification(db, bookmark.id);
if (existing) continue;
```

Also remove the unused `getClassification` import.

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Update tests

Check `src/pipeline/__tests__/classify-and-notify.test.ts` — the tests should still pass since the behavior is equivalent (unclassified bookmarks get classified). If tests reference `getStoredBookmarks` or `getClassification` directly, update them.

**Verify**: `pnpm test -- classify-and-notify` → all tests pass

### Step 5: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → all pass

## Test plan

- Existing classify-and-notify tests should pass without changes (behavior is identical)
- If any test explicitly asserts that `getStoredBookmarks` is called, update it to reflect the new query path
- Pattern to follow: `src/pipeline/__tests__/classify-and-notify.test.ts`

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -n "getStoredBookmarks" src/pipeline/classify-and-notify.ts` returns no matches
- [ ] `grep -n "getClassification" src/pipeline/classify-and-notify.ts` returns no matches
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The LEFT JOIN query doesn't work with libSQL (test with `db.execute`)
- `getStoredBookmarks` or `getClassification` have changed since commit `9eea449`
- Tests fail after the change and cannot be fixed by updating test expectations

## Maintenance notes

- This plan reduces classifyAndNotify from O(3N+1) queries to O(1) for the bookmark-fetching phase. The per-bookmark classification call (`classifyBookmark`) still runs one at a time — batch classification is a separate optimization (plan 022).
- The `getUnclassifiedBookmarks` helper is local to this file. If other callers need it, extract to `src/db/classifications.ts` as a reusable function.

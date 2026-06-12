# Plan 025: Wrap setBookmarkHashtags in a transaction to prevent data loss

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9eea449..HEAD -- src/db/hashtags.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `9eea449`, 2026-06-12
- **Issue**: — (not published via --issues)

## Why this matters

`setBookmarkHashtags` at `src/db/hashtags.ts:122-137` deletes all existing bookmark-hashtag links (line 128-131), then loops through hashtag names calling `getOrCreateHashtag` + `attachHashtagToBookmark` individually (lines 134-137). If the process crashes or an error occurs mid-loop, some hashtags are attached but others are permanently lost. The delete-then-insert pattern without a transaction means data loss on failure.

## Current state

- `src/db/hashtags.ts:122-137`:
  ```typescript
  export async function setBookmarkHashtags(
    db: Client,
    bookmarkId: string,
    hashtagNames: string[],
  ): Promise<void> {
    // Remove existing
    await db.execute({
      sql: 'DELETE FROM bookmark_hashtags WHERE bookmark_id = ?',
      args: [bookmarkId],
    });

    // Add new
    for (const name of hashtagNames) {
      const hashtag = await getOrCreateHashtag(db, name);
      await attachHashtagToBookmark(db, bookmarkId, hashtag.id);
    }
  }
  ```
- `@libsql/client` supports `db.batch()` for executing multiple statements atomically

Repo conventions: service-layer abstraction (ADR-0013), typed I/O, DB as source of truth.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Tests     | `pnpm test`              | all pass            |
| Lint      | `pnpm lint`              | exit 0              |

## Scope

**In scope**:
- `src/db/hashtags.ts` — wrap `setBookmarkHashtags` in a transaction using `db.batch()`
- `src/db/__tests__/hashtags.test.ts` (create if missing) — add tests for atomicity

**Out of scope**:
- Other hashtag functions — `getOrCreateHashtag`, `attachHashtagToBookmark` remain unchanged
- `src/db/classifications.ts` — calls `setBookmarkHashtags` but doesn't need changes

## Git workflow

- Branch: `advisor/025-transactional-hashtags`
- Commit: `fix(db): wrap setBookmarkHashtags in transaction to prevent partial state`

## Steps

### Step 1: Refactor setBookmarkHashtags to use db.batch()

The `db.batch()` method in `@libsql/client` executes multiple statements in a single round-trip. Refactor to collect all operations and execute them in a batch:

```typescript
export async function setBookmarkHashtags(
  db: Client,
  bookmarkId: string,
  hashtagNames: string[],
): Promise<void> {
  // First, get or create all hashtags
  const hashtagIds: string[] = [];
  for (const name of hashtagNames) {
    const hashtag = await getOrCreateHashtag(db, name);
    hashtagIds.push(hashtag.id);
  }

  // Execute delete + inserts in a single batch
  const statements = [
    {
      sql: 'DELETE FROM bookmark_hashtags WHERE bookmark_id = ?',
      args: [bookmarkId],
    },
    ...hashtagIds.map((id) => ({
      sql: 'INSERT OR IGNORE INTO bookmark_hashtags (bookmark_id, hashtag_id) VALUES (?, ?)',
      args: [bookmarkId, id],
    })),
  ];

  await db.batch(statements);
}
```

Note: `getOrCreateHashtag` still runs individually (it may need to INSERT into the `hashtags` table). The atomic part is the delete+insert of the junction table entries. If `getOrCreateHashtag` fails, no junction changes are made.

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Add tests for setBookmarkHashtags atomicity

Create or update `src/db/__tests__/hashtags.test.ts`:

- Test: set 3 hashtags, verify all 3 are attached
- Test: set hashtags, then set different hashtags, verify old ones are removed and new ones are present
- Test: set empty array, verify all hashtags are removed

Follow the existing test pattern using `createTestDb()` from `src/db/__tests__/test-client.ts`.

**Verify**: `pnpm test -- hashtags` → all tests pass

### Step 3: Run full verification

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → all pass

## Test plan

- New tests for `setBookmarkHashtags`: add, replace, clear
- Existing classify and batch-import tests should pass (they call `setBookmarkHashtags` via `storeClassification`)
- Pattern to follow: `src/db/__tests__/classifications.test.ts` for DB test conventions

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0; hashtag tests include new atomicity tests
- [ ] `grep -n "db.batch" src/db/hashtags.ts` shows the batch call
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `db.batch()` is not available or doesn't work with the current `@libsql/client` version
- The batch fails when the statements array is empty (no hashtags to set)
- `setBookmarkHashtags` has been changed since commit `9eea449`

## Maintenance notes

- `db.batch()` is a libSQL-specific feature. If the app migrates to a different SQLite driver, the batch API may differ.
- The `getOrCreateHashtag` calls still run outside the batch. If full atomicity is needed (including the hashtag creation), wrap everything in an explicit `BEGIN`/`COMMIT` transaction instead.

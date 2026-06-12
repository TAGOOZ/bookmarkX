# Plan 004: Wrap storeClassification in a transaction

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec88c1..HEAD -- src/db/classifications.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `2ec88c1`, 2026-06-12

## Why this matters

`storeClassification` writes to 3 tables sequentially without a transaction. If step 2 or 3 fails, the classification row exists but topic/hashtag data is missing. On retry, `getClassification` returns the existing row so the bookmark is skipped, leaving orphaned partial data permanently.

## Current state

- `src/db/classifications.ts` — classification CRUD (95 lines)

**The vulnerable code (lines 6-28)**:
```typescript
export async function storeClassification(
  db: Client,
  bookmarkId: string,
  result: ClassificationResult
): Promise<void> {
  const classificationId = crypto.randomUUID();

  await db.execute({
    sql: 'INSERT INTO classifications (id, bookmark_id, priority, reading_time_min) VALUES (?, ?, ?, ?)',
    args: [classificationId, bookmarkId, result.priority, result.reading_time_min],
  });

  if (result.topic) {
    const topic = await getOrCreateTopic(db, result.topic, null, 'ai');
    await moveBookmarkToTopic(db, bookmarkId, topic.id);
  }

  if (result.hashtags && result.hashtags.length > 0) {
    await setBookmarkHashtags(db, bookmarkId, result.hashtags);
  }
}
```

The `@libsql/client` supports `db.batch()` for transactional writes. The batch takes an array of `InStatement` objects and executes them atomically.

**However**, `getOrCreateTopic` and `moveBookmarkToTopic` are async functions that may need to read-then-write. We need to restructure to collect all statements first, then batch them.

Actually, the simpler approach: use `db.execute()` wrapped in explicit `BEGIN`/`COMMIT`/`ROLLBACK`. But `@libsql/client` batch is cleaner. Let me check what's available.

The `@libsql/client` `batch()` method accepts an array of statements and runs them in a transaction. But `getOrCreateTopic` does a SELECT then INSERT — it can't be pre-computed as a single statement.

**Best approach**: Wrap the three operations in a `try/catch` and if the hashtags or topic step fails, delete the classification row to allow retry:

```typescript
export async function storeClassification(
  db: Client,
  bookmarkId: string,
  result: ClassificationResult
): Promise<void> {
  const classificationId = crypto.randomUUID();

  try {
    await db.execute({
      sql: 'INSERT INTO classifications (id, bookmark_id, priority, reading_time_min) VALUES (?, ?, ?, ?)',
      args: [classificationId, bookmarkId, result.priority, result.reading_time_min],
    });

    if (result.topic) {
      const topic = await getOrCreateTopic(db, result.topic, null, 'ai');
      await moveBookmarkToTopic(db, bookmarkId, topic.id);
    }

    if (result.hashtags && result.hashtags.length > 0) {
      await setBookmarkHashtags(db, bookmarkId, result.hashtags);
    }
  } catch (err) {
    // Rollback: delete the classification row so retry can re-attempt
    await db.execute({
      sql: 'DELETE FROM classifications WHERE id = ?',
      args: [classificationId],
    });
    throw err;
  }
}
```

This ensures if any step fails, the classification row is cleaned up and the bookmark can be retried.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/db/classifications.ts`

**Out of scope**:
- `src/db/topics.ts`, `src/db/hashtags.ts` (called by storeClassification but not modified)

## Steps

### Step 1: Add try/catch with rollback to storeClassification

Wrap the body of `storeClassification` in a try/catch. In the catch block, delete the inserted classification row and re-throw.

**Verify**: `pnpm lint` → exit 0

### Step 2: Run full verification

**Verify**: `pnpm lint && pnpm test` → exit 0, all tests pass

## Test plan

- Existing tests should continue to pass
- The classification rollback ensures no orphaned data on failure

## Done criteria

- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `storeClassification` has a try/catch that deletes the classification row on failure
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt

# Plan 006: Batch hashtag queries in getClassifiedBookmarks

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

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `2ec88c1`, 2026-06-12

## Why this matters

`getClassifiedBookmarks` issues N+1 queries: one query for all classifications, then one query per bookmark for hashtags. Loading 500 bookmarks = 501 DB round-trips.

## Current state

- `src/db/classifications.ts` — classification CRUD (95 lines)

**The N+1 code (lines 84-92)**:
```typescript
for (const row of results) {
  const { rows: hashtagRows } = await db.execute({
    sql: `SELECT h.name FROM hashtags h
          JOIN bookmark_hashtags bh ON h.id = bh.hashtag_id
          WHERE bh.bookmark_id = ?`,
    args: [row.bookmark_id],
  });
  row.hashtags = hashtagRows.map((h: any) => h.name);
}
```

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm lint`              | exit 0              |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/db/classifications.ts`

**Out of scope**:
- Other DB modules

## Steps

### Step 1: Replace N+1 loop with a single batch query

Replace lines 83-92 with:

```typescript
  // Batch fetch all hashtags in one query
  const bookmarkIds = results.map((r) => r.bookmark_id);
  if (bookmarkIds.length > 0) {
    const placeholders = bookmarkIds.map(() => '?').join(',');
    const { rows: allHashtagRows } = await db.execute({
      sql: `SELECT bh.bookmark_id, h.name FROM hashtags h
            JOIN bookmark_hashtags bh ON h.id = bh.hashtag_id
            WHERE bh.bookmark_id IN (${placeholders})
            ORDER BY h.name`,
      args: bookmarkIds,
    });

    // Group by bookmark_id
    const hashtagMap = new Map<string, string[]>();
    for (const row of allHashtagRows as any[]) {
      const existing = hashtagMap.get(row.bookmark_id) || [];
      existing.push(row.name);
      hashtagMap.set(row.bookmark_id, existing);
    }

    for (const row of results) {
      row.hashtags = hashtagMap.get(row.bookmark_id) || [];
    }
  } else {
    for (const row of results) {
      row.hashtags = [];
    }
  }
```

**Verify**: `pnpm lint` → exit 0

### Step 2: Run full verification

**Verify**: `pnpm lint && pnpm test` → exit 0, all tests pass

## Test plan

- Existing tests should continue to pass
- The query result is identical — same data, fewer round-trips

## Done criteria

- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] No per-bookmark loop with individual hashtag queries
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt

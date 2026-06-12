# Plan 001: Fix batch import abort callback and missing LIMIT parameter

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec88c1..HEAD -- src/pipeline/batch-import.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `2ec88c1`, 2026-06-12

## Why this matters

The batch import has two active bugs that make it non-functional:
1. The pause button does nothing because the abort callback is immediately nulled (line 67).
2. The classification phase crashes with a SQL error because `LIMIT ?` has no bound parameter (line 122-127).

Both bugs are in the same file and both are one-line fixes.

## Current state

- `src/pipeline/batch-import.ts` — the batch import pipeline (308 lines)

**Bug 1 — abort callback immediately nulled (lines 64-67)**:
```typescript
  let aborted = false;

  activeAbort = () => { aborted = true; };
  activeAbort = null;   // <-- BUG: immediately nulls the callback
```

The `finally` block at line 268 also sets `activeAbort = null;`, which is the correct cleanup location. Line 67 must be deleted.

**Bug 2 — LIMIT ? with no args (lines 122-127)**:
```typescript
  const { rows } = await db.execute(
    `SELECT b.id FROM bookmarks b
     LEFT JOIN classifications c ON b.id = c.bookmark_id
     WHERE c.id IS NULL
     LIMIT ?`
  );
```

No `args` array is provided. The libSQL client cannot bind `?` without args. Compare with `src/db/article-content.ts:125-134` which correctly uses `{ sql, args }` form.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Lint      | `pnpm lint`              | exit 0, no errors   |
| Tests     | `pnpm test`              | all pass            |

## Scope

**In scope**:
- `src/pipeline/batch-import.ts`

**Out of scope**:
- Any other pipeline files
- UI components (ImportProgress.tsx)

## Steps

### Step 1: Remove the premature `activeAbort = null` on line 67

Delete line 67 (`activeAbort = null;`). The `finally` block at line 268 already handles cleanup when the import completes or fails.

**Verify**: `grep -n "activeAbort = null" src/pipeline/batch-import.ts` → only one match at line 268 (the `finally` block)

### Step 2: Fix the LIMIT ? query to use parameterized args

Change lines 122-127 from:
```typescript
const { rows } = await db.execute(
  `SELECT b.id FROM bookmarks b
   LEFT JOIN classifications c ON b.id = c.bookmark_id
   WHERE c.id IS NULL
   LIMIT ?`
);
```

To:
```typescript
const { rows } = await db.execute({
  sql: `SELECT b.id FROM bookmarks b
   LEFT JOIN classifications c ON b.id = c.bookmark_id
   WHERE c.id IS NULL
   LIMIT ?`,
  args: [CLASSIFY_BATCH_SIZE],
});
```

Import `CLASSIFY_BATCH_SIZE` if not already in scope (it is defined at the top of the file).

**Verify**: `pnpm lint` → exit 0

### Step 3: Run full verification

**Verify**: `pnpm lint && pnpm test` → exit 0, all tests pass

## Test plan

No new tests needed — these are bug fixes for broken code paths. The existing test infrastructure should continue to pass.

## Done criteria

- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0
- [ ] `grep -n "activeAbort = null" src/pipeline/batch-import.ts` returns exactly 1 match (the finally block)
- [ ] The LIMIT query uses `{ sql, args }` form with a bound parameter
- [ ] `plans/README.md` status row updated

## STOP conditions

- The code at the locations in "Current state" doesn't match the excerpts
- A step's verification fails twice after a reasonable fix attempt
- The fix appears to require touching an out-of-scope file
